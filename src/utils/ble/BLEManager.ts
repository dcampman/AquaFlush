import {mockBLEDevice} from './MockBLE';
import {setupMockBLE} from './setupMockBLE';

export function connectToBLEService(serviceUUID: string) {
  if (process.env.NODE_ENV === 'development') {
    setupMockBLE(); // Initialize mock BLE for development

    const service = mockBLEDevice.getService(serviceUUID);
    if (service) {
      // Example of interacting with a characteristic
      const valveCharacteristic = service.getCharacteristic('Valve1_UUID');
      if (valveCharacteristic) {
        console.log(`Read Valve1 Config: ${valveCharacteristic.read()}`);
      }

      // Simulate enabling admin mode
      const adminModeCharacteristic =
        service.getCharacteristic('Admin_Mode_UUID');
      if (adminModeCharacteristic) {
        adminModeCharacteristic.write('ENABLE');
        adminModeCharacteristic.notify(); // Simulate a notification
      }
    } else {
      console.error('Service not found');
    }
  } else {
    // Insert your real BLE logic here for production or physical devices
  }
}
