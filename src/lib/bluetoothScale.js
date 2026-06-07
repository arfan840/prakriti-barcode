/**
 * Bluetooth Weighing Scale Integration Library
 * Supporting both standard GATT profiles (Weight Scale) and UART/Serial streaming scales,
 * with standard browser dialogs and simulated fallback.
 */

let activeDevice = null;
let activeCharacteristic = null;

/**
 * Checks if the Web Bluetooth API is supported by the current browser environment.
 * Note: Web Bluetooth requires an HTTPS context (or localhost).
 */
export const isWebBluetoothSupported = () => {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth;
};

/**
 * Checks if a scale is currently connected.
 */
export const isScaleConnected = () => {
  return !!(activeDevice && activeDevice.gatt && activeDevice.gatt.connected);
};

/**
 * Gets the name of the currently connected scale device.
 */
export const getConnectedDeviceName = () => {
  return activeDevice ? (activeDevice.name || 'Weighing Scale') : '';
};

/**
 * Disconnects the active Bluetooth device connection if one exists.
 */
export const disconnectActiveDevice = () => {
  if (activeCharacteristic) {
    try {
      activeCharacteristic.removeEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
    } catch (_) {}
    activeCharacteristic = null;
  }
  if (activeDevice && activeDevice.gatt && activeDevice.gatt.connected) {
    activeDevice.gatt.disconnect();
    console.log('Bluetooth device disconnected successfully.');
  }
  activeDevice = null;
};

// Internal reference to current listeners
let currentOnWeightReceived = null;
let currentOnError = null;

// Standard GATT Weight Scale UUIDs
const WEIGHT_SCALE_SERVICE_UUID = '0000181d-0000-1000-8000-00805f9b34fb';
const WEIGHT_MEASUREMENT_CHAR_UUID = '00002a9d-0000-1000-8000-00805f9b34fb';

// Nordic UART Service (NUS) UUIDs (Common in custom scale modules)
const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

// Other common custom scale services
const FFF0_SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const FFF1_CHAR_UUID = '0000fff1-0000-1000-8000-00805f9b34fb';

const FFE0_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
const FFE1_CHAR_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';

/**
 * Parser for standard Weight Measurement characteristic (0x2A9D)
 */
const parseStandardWeightMeasurement = (value) => {
  const flags = value.getUint8(0);
  const isImperial = (flags & 0x01) !== 0; // Bit 0: 0 = Metric (kg), 1 = Imperial (lb)
  
  // Weight value is at byte index 1 (UINT16)
  const rawWeight = value.getUint16(1, true); // Little endian
  
  // SIG specification: Multiplier for SI is 0.005, for Imperial is 0.01
  let weight = isImperial ? rawWeight * 0.01 : rawWeight * 0.005;
  
  // If imperial, convert to kg for application consistency
  if (isImperial) {
    weight = weight * 0.45359237;
  }
  return weight;
};

/**
 * Parser for ASCII/Text-based streams (common in UART scales)
 */
const parseAsciiWeightMeasurement = (value) => {
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(value);
  
  // Match a floating point or integer number
  const match = text.match(/[-+]?\d*\.\d+|\d+/);
  if (match) {
    const parsed = parseFloat(match[0]);
    if (!isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
};

/**
 * Internal handler for value changes on characteristics
 */
const handleCharacteristicValueChanged = (event) => {
  const value = event.target.value; // DataView
  const uuid = event.target.uuid.toLowerCase();
  
  try {
    let weight = null;
    
    if (uuid.includes('2a9d')) {
      weight = parseStandardWeightMeasurement(value);
    } else {
      // Fallback to ASCII decoder for serial/UART scales
      weight = parseAsciiWeightMeasurement(value);
    }
    
    if (weight !== null && currentOnWeightReceived) {
      currentOnWeightReceived(weight.toFixed(3));
    }
  } catch (err) {
    console.error('Error parsing scale characteristic value:', err);
  }
};

/**
 * Request, connect, and subscribe to a Bluetooth scale.
 * 
 * @param {function} onWeightReceived Callback invoked when a weight reading is obtained.
 * @param {function} onError Callback invoked when an error occurs during connection/reading.
 * @param {function} onStatusUpdate Callback invoked with a string updating connection status.
 */
export const connectBluetoothScale = async (onWeightReceived, onError, onStatusUpdate = () => {}) => {
  if (!isWebBluetoothSupported()) {
    onError(new Error('Web Bluetooth is not supported in this browser or context. HTTPS is required.'));
    return;
  }

  currentOnWeightReceived = onWeightReceived;
  currentOnError = onError;

  // Reuse existing connection if active
  if (activeDevice && activeDevice.gatt && activeDevice.gatt.connected && activeCharacteristic) {
    onStatusUpdate(`Using connected scale "${activeDevice.name || 'Weighing Scale'}"`);
    try {
      try {
        activeCharacteristic.removeEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
      } catch (_) {}
      activeCharacteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
      onStatusUpdate('Awaiting weight reading...');
      return;
    } catch (err) {
      console.warn('Failed to reuse active characteristic, reconnecting...', err);
      disconnectActiveDevice();
    }
  } else {
    // Clear any half-open/stale connection
    disconnectActiveDevice();
  }

  try {
    onStatusUpdate('Requesting Bluetooth device...');
    
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        WEIGHT_SCALE_SERVICE_UUID,
        NUS_SERVICE_UUID,
        FFF0_SERVICE_UUID,
        FFE0_SERVICE_UUID
      ]
    });

    activeDevice = device;
    onStatusUpdate(`Connecting to device "${device.name || 'Unknown Scale'}"...`);

    // Listen for disconnect events
    device.addEventListener('gattserverdisconnected', () => {
      onStatusUpdate('Scale disconnected.');
      if (currentOnError) {
        currentOnError(new Error('Bluetooth connection lost.'));
      }
    });

    const server = await device.gatt.connect();
    onStatusUpdate('Discovering services...');

    // Find services and characteristics
    let charToNotify = null;

    // Try standard Weight Scale Service first
    try {
      const service = await server.getPrimaryService(WEIGHT_SCALE_SERVICE_UUID);
      charToNotify = await service.getCharacteristic(WEIGHT_MEASUREMENT_CHAR_UUID);
      onStatusUpdate('Connected to standard SIG Weight Scale.');
    } catch (_) {
      // Try Nordic UART Service (NUS)
      try {
        const service = await server.getPrimaryService(NUS_SERVICE_UUID);
        charToNotify = await service.getCharacteristic(NUS_TX_CHAR_UUID);
        onStatusUpdate('Connected to UART/Serial Scale.');
      } catch (_) {
        // Try Custom FFF0
        try {
          const service = await server.getPrimaryService(FFF0_SERVICE_UUID);
          charToNotify = await service.getCharacteristic(FFF1_CHAR_UUID);
          onStatusUpdate('Connected to Custom FFF0 Scale.');
        } catch (_) {
          // Try Custom FFE0
          try {
            const service = await server.getPrimaryService(FFE0_SERVICE_UUID);
            charToNotify = await service.getCharacteristic(FFE1_CHAR_UUID);
            onStatusUpdate('Connected to Custom FFE0 Scale.');
          } catch (err) {
            throw new Error('No supported weighing services or characteristics found on this device.');
          }
        }
      }
    }

    if (charToNotify) {
      activeCharacteristic = charToNotify;
      await charToNotify.startNotifications();
      charToNotify.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
      onStatusUpdate('Awaiting weight reading...');
    } else {
      throw new Error('Failed to resolve notifications channel.');
    }

  } catch (err) {
    disconnectActiveDevice();
    onError(err);
  }
};

/**
 * Fallback weight simulator matching original codebase's mock logic
 */
export const simulateWeightFetch = (onWeightReceived, onStart = () => {}, onEnd = () => {}) => {
  onStart();
  setTimeout(() => {
    const mockWeight = (Math.random() * 4 + 1).toFixed(3);
    onWeightReceived(mockWeight);
    onEnd();
  }, 1200);
};
