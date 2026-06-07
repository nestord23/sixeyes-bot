import { logger } from '../utils/logger';

const BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles';

export interface VehicleVariable {
  VariableId: number;
  VariableName: string;
  Value: string;
  ValueId: number | string;
}

export interface VehicleSpecs {
  make: string;
  model: string;
  year: number;
  verified: boolean;
  engineHP: number | null;
  engineDisplacementCC: number | null;
  engineDisplacementL: string | null;
}

export async function getVehicleSpecs(
  make: string,
  model: string,
  year: number,
): Promise<VehicleSpecs | null> {
  try {
    const params = new URLSearchParams({
      format: 'json',
    });

    const res = await fetch(
      `${BASE_URL}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?${params}`,
    );

    if (!res.ok) {
      logger.error(`NHTSA request failed: ${res.status}`);
      return null;
    }

    const data = (await res.json()) as {
      Count: number;
      Results: Array<{ Make_Name: string; Model_Name: string }>;
    };

    if (!data.Results || data.Results.length === 0) {
      logger.warn(`No results from NHTSA for ${make} ${model} ${year}`);
      return null;
    }

    const match = data.Results.find(
      (r) => r.Model_Name.toLowerCase() === model.toLowerCase(),
    );

    const vehicleMake = match?.Make_Name || data.Results[0].Make_Name;
    const vehicleModel = match?.Model_Name || model;

    return {
      make: vehicleMake,
      model: vehicleModel,
      year,
      verified: true,
      engineHP: null,
      engineDisplacementCC: null,
      engineDisplacementL: null,
    };
  } catch (error) {
    logger.error('NHTSA getVehicleSpecs error:', error);
    return null;
  }
}
