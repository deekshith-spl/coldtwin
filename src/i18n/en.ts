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
  status_normal:      'Normal',
  status_warning:     'Warning',
  status_critical:    'Critical',

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
  store_name:              'Store Name',
  tariff:                  'Electricity Tariff (₹/kWh)',
  language:                'Language',
  thresholds:              'Alert Thresholds',
  general_config:          'General Configuration',
  general_config_sub:      'Configure facility parameters, electricity tariffs, and produce baseline values.',
  fault_risk_score_alert:  'Fault Risk Alert Score (0-100)',
  max_temp_deviation:      'Max Temp Deviation (°C)',
  urgent_shelf_red:        'Urgent Shelf-Life Red (< days)',
  warning_shelf_amber:     'Warning Shelf-Life Amber (< days)',
  min_safe_temp:           'Min Safe Temp (°C)',
  produce_library:         'Produce Reference Library',
  produce_library_sub:     'Ideal parameters, safe limits, and Q10 rate constants used for shelf-life estimations.',
  reset_defaults:          'Reset to Default Values',
  clear_stored_data:       'Clear Stored Data',
  reset_clear_data:        'Reset & Clear Data',
  saved_successfully:      'Saved Successfully',
  replay_tour:             'Replay tour',

  // Reports
  todays_sell_first:     "Today's Sell-First List",
  farmer_report:         'Farmer Report',
  export_rankings:       'Export Rankings CSV',
  export_alerts:         'Export Alerts CSV',
  select_farmer:         'Select Farmer',
  choose_farmer:         '-- Choose a farmer --',
  preview_farmer_prompt: 'Select a farmer above to preview their report.',
  no_lots_for_farmer:    'No lots for this farmer.',
  lot_status_report:     'LOT STATUS REPORT',
  estimates_disclaimer:  'ColdTwin — Estimates only. Validate with actual observations.',
  reports_sub:           'Print or export data for staff, owners, and farmers.',

  // Data Input
  quick_start_demo:   'Quick start with demo data',
  demo_details:       '60 days, 4 chambers, 12 lots, 2 injected faults',
  drop_csv_excel:     'Drop CSV or Excel file here',
  supports_csv_xlsx:  'Supports .csv and .xlsx · Columns auto-detected',
  tab_upload:         'Upload CSV / Excel',
  tab_manual:         'Manual Entry',
  tab_templates:      'Download Templates',
  readings_template:  'Readings CSV Template',
  lots_template:      'Lots CSV Template',

  // Dashboard & Twin
  no_readings_loaded:  'No facility readings loaded yet. Experience ColdTwin instantly with realistic 60-day multi-chamber data.',
  all_normal_energy:   'All chambers within normal energy use.',
  urgent_action_lots:  'Lots needing urgent action',
  sell_within_week:    'Lots to sell within a week',
  excess_energy_cost:  'Estimated excess energy cost this period:',
  clear_simulation:    'Clear Simulation',
  simulation_active:   'Simulation active:',

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
