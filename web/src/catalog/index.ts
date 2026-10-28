import { american } from './american';
import { supersport } from './supersport';
import type { Vehicle, VehicleId } from './types';

/** カタログ(Catalog): 登録済みのベース車両。サーバー化したら API から読み込む。 */
export const VEHICLES: Record<VehicleId, Vehicle> = { ss: supersport, us: american };
export const VEHICLE_IDS = Object.keys(VEHICLES) as VehicleId[];
export const isVehicleId = (v: unknown): v is VehicleId => typeof v === 'string' && v in VEHICLES;
