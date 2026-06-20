export const COURIER_LOGOS: Record<string, string> = {
  gojek: 'gojek.png',
  grab: 'grab.png',
  deliveree: 'deliveree.png',
  jne: 'jne.png',
  tiki: 'tiki.png',
  ninja: 'ninjaexpress.png',
  lion: 'lionparcel.png',
  sicepat: 'sicepat.png',
  sentralcargo: 'sentralcargo.png',
  jnt: 'j&t.png',
  idexpress: 'idexpress.png',
  rpx: 'rpx.png',
  wahana: 'wahana.png',
  pos: 'posindonesia.png',
  tlx: 'tlx.jpeg',
  anteraja: 'antaraja.png',
  sap: 'sap.png',
  paxel: 'paxel.png',
  borzo: 'borzo.png',
  lalamove: 'lalamove.png',
  dash_express: 'dash.png',
};

export function getCourierLogoUrl(courierCode: string): string | undefined {
  const file = COURIER_LOGOS[courierCode];
  return file ? `/couriers/${file}` : undefined;
}
