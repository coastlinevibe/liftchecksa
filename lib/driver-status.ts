export type DriverApprovalStatus = 'approved' | 'pending' | 'rejected';

type DriverApprovalLike = {
  id_status?: string | null;
  vehicle_status?: string | null;
};

export function isDriverIdentityApproved(driver: DriverApprovalLike | null | undefined) {
  return driver?.id_status === 'approved';
}

export function isDriverVehicleApproved(driver: DriverApprovalLike | null | undefined) {
  return driver?.vehicle_status === 'approved';
}

export function isDriverFullyApproved(driver: DriverApprovalLike | null | undefined) {
  return isDriverIdentityApproved(driver) && isDriverVehicleApproved(driver);
}

export function getDriverApprovalStatus(driver: DriverApprovalLike | null | undefined): DriverApprovalStatus {
  const idStatus = driver?.id_status ?? 'pending';
  const vehicleStatus = driver?.vehicle_status ?? 'pending';

  if (idStatus === 'rejected' || vehicleStatus === 'rejected') {
    return 'rejected';
  }

  if (idStatus === 'approved' && vehicleStatus === 'approved') {
    return 'approved';
  }

  return 'pending';
}
