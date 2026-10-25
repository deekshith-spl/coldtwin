// English strings
export const en = {
  // Navigation
  nav_dashboard:    'Dashboard',
  nav_data_input:   'Data Input',
  nav_digital_twin: 'Digital Twin',
  nav_lots:         'Lots',
  nav_reports:      'Reports',
  nav_settings:     'Settings',
  nav_assumptions:  'Assumptions',

  // Status banner
  status_all_normal:  'All chambers normal',
  status_attention:   '{n} items need attention',

  // Dashboard cards
  sell_first:         'Sell First',
  sell_first_sub:     'Lots ranked by remaining shelf life',
  fix_before_breaks:  'Fix Before It Breaks',
  fix_before_sub:     'Equipment fault risk alerts',
  energy_waste:       'Energy Waste (Estimated)',
  savings_summary:    'Savings Summary',

  // Urgency
  urgency_red:    'Urgent',
  urgency_amber:  'Soon',
  urgency_green:  'OK',

  // Lot fields
  lot_id:         'Lot ID',
  produce:        'Produce',
  chamber:        'Chamber',
  farmer:         'Farmer',
  remaining_life: 'Remaining Life',
  quantity:       'Quantity (kg)',
  arrival_date:   'Arrival Date',

  // Actions
  load_demo:      'Load Demo Data',
  print:          'Print / Save PDF',
  export_csv:     'Export CSV',
  add_reading:    'Add Reading',
  save:           'Save',
  cancel:         'Cancel',
  simulate_fault: 'Simulate a Fault',

  // Fault types
  fault_blocked_coil:   'Blocked Coil',
  fault_door_open:      'Door Left Open',
  fault_short_cycling:  'Short Cycling',

  // Risk score
  risk_score:   'Fault Risk Score',
  risk_low:     'Low Risk',
  risk_medium:  'Medium Risk',
  risk_high:    'High Risk',

  // Energy
  extra_kwh:    'Extra kWh (estimated)',
  extra_cost:   'Extra Cost ₹ (estimated)',

  // Settings
  store_name:   'Store Name',
  tariff:       'Electricity Tariff (₹/kWh)',
  language:     'Language',
  thresholds:   'Alert Thresholds',

  // Misc
  demo_badge:   'Demo Data',
  estimates:    'All values are estimates',
  why:          'Why?',
  assumptions:  'Assumptions',
  role_owner:   'Owner View',
  role_farmer:  'Farmer View',
  role_staff:   'Staff View',
  no_alerts:    'No active alerts',
  days:         'days',
  range:        'range',
  unknown:      'Unknown',
  about:        'About ColdTwin',
};

export type Strings = typeof en;
