export const IRISH_COUNTIES = [
  'Antrim','Armagh','Carlow','Cavan','Clare','Cork','Derry','Donegal','Down',
  'Dublin','Fermanagh','Galway','Kerry','Kildare','Kilkenny','Laois','Leitrim',
  'Limerick','Longford','Louth','Mayo','Meath','Monaghan','Offaly','Roscommon',
  'Sligo','Tipperary','Tyrone','Waterford','Westmeath','Wexford','Wicklow',
] as const;

export type IrishCounty = typeof IRISH_COUNTIES[number];
