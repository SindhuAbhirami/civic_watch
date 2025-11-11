# 🚀 trainmodel_v2.py — Upgraded with MobileNetV2 + Advanced Fine-tuning + Test Evaluation + Callbacks
# Modified for local execution in VS Code (removed Google Colab specifics)
# Changed base model from MobileNetV3Large to MobileNetV2

import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2 # <--- CHANGED FROM MobileNetV3Large
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model, load_model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import ReduceLROnPlateau, EarlyStopping, ModelCheckpoint
from tensorflow.keras.preprocessing import image

import pandas as pd
import os
import datetime
import matplotlib.pyplot as plt
import numpy as np
import sys

# Suppress TF warnings (for cleaner output)
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
tf.compat.v1.logging.set_verbosity(tf.compat.v1.logging.ERROR)

# === Configuration ===
IMG_SIZE = (224, 224) # MobileNetV2 also typically uses 224x224
BATCH_SIZE = 16
EPOCHS_INITIAL = 50
EPOCHS_FINE_TUNE = 100
FINE_TUNE_AT = 70 # Adjust this based on MobileNetV2's layers if needed, 70 is a good starting point
LEARNING_RATE_INITIAL = 0.001
LEARNING_RATE_FINE_TUNE = 0.00001
MODEL_SAVE_DIR = 'saved_models_v2' # Changed directory name to reflect V2
os.makedirs(MODEL_SAVE_DIR, exist_ok=True) # Ensure directory exists

# === Dataset paths ===
# *** IMPORTANT: Update 'your_local_dataset_folder_name' to your actual LOCAL folder path ***
# Example: If your script is in C:\my_project and data is in C:\my_project\dataset
# base_dataset_path = 'dataset'
base_dataset_path = 'dataset' # <--- CHANGE THIS LINE!

train_dir = os.path.join(base_dataset_path, 'train')
val_dir = os.path.join(base_dataset_path, 'valid')
test_dir = os.path.join(base_dataset_path, 'test')

# === Function: check dataset integrity ===
def check_dataset_classes(base_dir):
    print(f"\n📂 Checking dataset at: {base_dir}")
    if not os.path.exists(base_dir):
        print(f"❌ Error: Dataset directory '{base_dir}' not found. Please ensure it exists.")
        return True
    
    missing_or_empty = False
    class_folders = [f for f in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, f))]
    
    if not class_folders:
        print(f"❌ No class subdirectories found in '{base_dir}'. Training cannot proceed.")
        return True

    for cls in sorted(class_folders):
        path = os.path.join(base_dir, cls)
        img_files = [f for f in os.listdir(path) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.gif'))]
        if len(img_files) == 0:
            print(f"⚠️ Class '{cls}' in '{base_dir}' exists but is empty! Training may be affected.")
            missing_or_empty = True
    
    if missing_or_empty:
        print("❌ Warning: Some classes are empty. This can lead to errors or poor model performance.")
    return missing_or_empty

# --- Perform initial dataset checks ---
print("--- Dataset Integrity Checks ---")
dataset_issues = False
if check_dataset_classes(train_dir): dataset_issues = True
if check_dataset_classes(val_dir): dataset_issues = True
if check_dataset_classes(test_dir): dataset_issues = True

if dataset_issues:
    print("\n🚨 Dataset integrity issues detected. Please fix them before proceeding with training.")
    sys.exit(1)
print("--- Dataset Checks Complete ---\n")

# === Data generators (with moderate augmentation) ===
print("--- Setting up Data Generators ---")
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=20,
    width_shift_range=0.15,
    height_shift_range=0.15,
    zoom_range=0.25,
    brightness_range=[0.8, 1.2],
    horizontal_flip=True,
    fill_mode='nearest'
)
val_test_datagen = ImageDataGenerator(rescale=1./255)

train_gen = train_datagen.flow_from_directory(
    train_dir, target_size=IMG_SIZE, batch_size=BATCH_SIZE, class_mode='categorical'
)
val_gen = val_test_datagen.flow_from_directory(
    val_dir, target_size=IMG_SIZE, batch_size=BATCH_SIZE, class_mode='categorical'
)
test_gen = val_test_datagen.flow_from_directory(
    test_dir, target_size=IMG_SIZE, batch_size=BATCH_SIZE, class_mode='categorical', shuffle=False
)

NUM_CLASSES = len(train_gen.class_indices)
print(f"Number of classes detected: {NUM_CLASSES}")

# === Show image count per class ===
def count_images_per_class(generator, name):
    class_counts = {cls: 0 for cls in generator.class_indices.keys()}
    sorted_class_names = sorted(generator.class_indices.keys(), key=generator.class_indices.get)
    
    for cls in sorted_class_names:
        class_dir = os.path.join(generator.directory, cls)
        if os.path.exists(class_dir) and os.path.isdir(class_dir):
            img_files = [f for f in os.listdir(class_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.gif'))]
            class_counts[cls] = len(img_files)
            
    df = pd.DataFrame(list(class_counts.items()), columns=['Class', f'{name}_Count'])
    print(f"\n📂 {name} Dataset Class Distribution:")
    print(df.to_string(index=False))
    return df

train_df = count_images_per_class(train_gen, "Train")
val_df = count_images_per_class(val_gen, "Validation")
test_df = count_images_per_class(test_gen, "Test")

# === Model setup (MobileNetV2 base) === # <--- Base Model Changed Here
print("\n--- Setting up MobileNetV2 Base Model ---")
base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=IMG_SIZE + (3,)) # <--- MobileNetV2
base_model.trainable = False

x = GlobalAveragePooling2D()(base_model.output)
x = Dense(512, activation='relu')(x)
x = Dropout(0.5)(x)
output = Dense(NUM_CLASSES, activation='softmax')(x)

model = Model(inputs=base_model.input, outputs=output)
print("Model created with custom classification head.")

# === Callbacks for Advanced Training Management ===
print("\n--- Configuring Callbacks (ReduceLROnPlateau, EarlyStopping, ModelCheckpoint) ---")
reduce_lr = ReduceLROnPlateau(
    monitor='val_loss', factor=0.2, patience=5, min_lr=1e-7, verbose=1
)
early_stopping = EarlyStopping(
    monitor='val_loss', patience=15, restore_best_weights=True, verbose=1
)
timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
best_model_path = os.path.join(MODEL_SAVE_DIR, f"disaster_model_v2.h5") # <--- Model name changed
model_checkpoint = ModelCheckpoint(
    filepath=best_model_path,
    monitor='val_accuracy', save_best_only=True, mode='max', verbose=1
)
callbacks = [reduce_lr, early_stopping, model_checkpoint]
print("Callbacks configured.")

# === Step 1: Initial training (frozen base) ===
print("\n🚀 Initial training started (MobileNetV2 frozen)...") # <--- Message updated
model.compile(optimizer=Adam(learning_rate=LEARNING_RATE_INITIAL),
              loss='categorical_crossentropy',
              metrics=['accuracy'])

history_initial = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=EPOCHS_INITIAL,
    callbacks=callbacks
)

if os.path.exists(best_model_path):
    print(f"\n✨ Loading best weights from initial training (saved by ModelCheckpoint): {best_model_path}")
    model.load_weights(best_model_path)
else:
    print("\n⚠️ Best model from initial training not found (checkpoint might not have been triggered). Proceeding with last epoch's weights.")


# === Step 2: Fine-tuning (unfreezing last FINE_TUNE_AT layers) ===
print(f"\n🔧 Fine-tuning the model (unfreezing last {FINE_TUNE_AT} layers of the base model)...")

base_model.trainable = True

for i, layer in enumerate(base_model.layers):
    if i < len(base_model.layers) - FINE_TUNE_AT:
        layer.trainable = False
    elif not isinstance(layer, tf.keras.layers.BatchNormalization):
        layer.trainable = True
    else:
        layer.trainable = False

model.compile(optimizer=Adam(learning_rate=LEARNING_RATE_FINE_TUNE),
              loss='categorical_crossentropy',
              metrics=['accuracy'])

history_fine = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=EPOCHS_FINE_TUNE,
    callbacks=callbacks
)

# === Step 3: Evaluate on test set ===
if os.path.exists(best_model_path):
    print(f"\n🎉 Loading the overall best model for final evaluation from: {best_model_path}")
    final_model = load_model(best_model_path)
else:
    print("\n⚠️ Best model not found after fine-tuning. Evaluating with the model's current state (last epoch).")
    final_model = model

print("\n🧪 Evaluating on test set...")
test_loss, test_acc = final_model.evaluate(test_gen, verbose=1)
print(f"✅ Test Accuracy: {test_acc:.4f}")
print(f"✅ Test Loss: {test_loss:.4f}")

# === Step 4: Save trained model (the overall best one) ===
final_model_save_path = os.path.join(MODEL_SAVE_DIR, f"disaster_model_v2.h5") # <--- Model name changed
final_model.save(final_model_save_path) # Use final_model which loaded the best weights
print(f"✅ Best performing model saved as {final_model_save_path}")
print("🧾 Classes:", train_gen.class_indices)

# === Plotting training history ===
def plot_training_history(history_initial, history_fine=None):
    plt.figure(figsize=(12, 5))

    # Plot Accuracy
    plt.subplot(1, 2, 1)
    plt.plot(history_initial.history['accuracy'], label='Train Accuracy (Initial)')
    plt.plot(history_initial.history['val_accuracy'], label='Val Accuracy (Initial)')
    if history_fine:
        fine_tune_epochs_offset = len(history_initial.history['accuracy'])
        plt.plot(np.arange(fine_tune_epochs_offset, fine_tune_epochs_offset + len(history_fine.history['accuracy'])),
                 history_fine.history['accuracy'], label='Train Accuracy (Fine-tune)')
        plt.plot(np.arange(fine_tune_epochs_offset, fine_tune_epochs_offset + len(history_fine.history['val_accuracy'])),
                 history_fine.history['val_accuracy'], label='Val Accuracy (Fine-tune)')
    plt.title('Training and Validation Accuracy')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy')
    plt.legend()
    plt.grid(True)

    # Plot Loss
    plt.subplot(1, 2, 2)
    plt.plot(history_initial.history['loss'], label='Train Loss (Initial)')
    plt.plot(history_initial.history['val_loss'], label='Val Loss (Initial)')
    if history_fine:
        fine_tune_epochs_offset = len(history_initial.history['loss'])
        plt.plot(np.arange(fine_tune_epochs_offset, fine_tune_epochs_offset + len(history_fine.history['loss'])),
                 history_fine.history['loss'], label='Train Loss (Fine-tune)')
        plt.plot(np.arange(fine_tune_epochs_offset, fine_tune_epochs_offset + len(history_fine.history['val_loss'])),
                 history_fine.history['val_loss'], label='Val Loss (Fine-tune)')
    plt.title('Training and Validation Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()
    plt.grid(True)

    plt.tight_layout()
    plt.show()

plot_training_history(history_initial, history_fine)
print("Training history plots displayed.")
print("")
