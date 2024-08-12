import {MockBLEDevice} from './MockBLE';

// Create a mock BLE device instance
export const mockBLEDevice = new MockBLEDevice(); // Export this instance

export function setupMockBLE() {
  const valveServiceUUID = 'AquaFlush_Service_UUID';
  const valveService = mockBLEDevice.addService(valveServiceUUID);

  // Simulate 4 valves for testing
  for (let i = 0; i < 4; i++) {
    const valveUUID = `Valve${i + 1}_UUID`;
    valveService.addCharacteristic(valveUUID, 'Valve Default Config');
  }

  // Simulate an admin mode characteristic
  const adminModeUUID = 'Admin_Mode_UUID';
  valveService.addCharacteristic(adminModeUUID, 'DISABLED');
}
