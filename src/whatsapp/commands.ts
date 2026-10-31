import { rankLots } from '../engine/ranking.js';

type Snapshot = {
  chambers: any[];
  readings: any[];
  lots: any[];
  farmers: any[];
  produceMeta: any[];
  settings: any;
};

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

export function handleCommand(
  text: string,
  phone: string,
  snapshot: Snapshot
): string {
  const command = text.trim().toLowerCase();
  const normalizedPhone = normalizePhone(phone);

  // Find the farmer using the registered phone number.
  const farmer = snapshot.farmers.find(
    (f) =>
      f.phone &&
      normalizePhone(f.phone) === normalizedPhone
  );

  // Do not show farmer data to an unknown number.
  if (!farmer) {
    return (
      'This number is not registered with ColdTwin. ' +
      'Please contact the cold-store owner.'
    );
  }

  // Only include this farmer's lots.
  const farmerLots = snapshot.lots.filter(
    (lot) => lot.farmerId === farmer.id
  );

  if (
    ['1', 'sell', 'hi', 'hello', 'menu'].includes(command)
  ) {
    const ranked = rankLots(
      farmerLots,
      snapshot.readings,
      snapshot.produceMeta,
      snapshot.settings.alertThresholds
    );

    if (ranked.length === 0) {
      return 'No produce lots found for your account.';
    }

    const icons = {
      red: '🔴',
      amber: '🟠',
      green: '🟢',
    };

    const lines = ranked.slice(0, 5).map((item, index) => {
      return (
        `${index + 1}. ${icons[item.urgency]} ` +
        `${item.lot.produce}: ${item.lot.quantityKg} kg\n` +
        `Estimated remaining life: ` +
        `${Math.round(item.lowDays)}–` +
        `${Math.round(item.highDays)} days`
      );
    });

    return (
      '*ColdTwin — Sell First Today*\n\n' +
      lines.join('\n\n') +
      '\n\nThese are estimates based on the available data.'
    );
  }

  if (command === '3' || command === 'help') {
    return (
      '*ColdTwin Help*\n\n' +
      'Reply 1 to see which produce to sell first.\n' +
      'Reply 3 to see these instructions again.'
    );
  }

  return (
    'Invalid command.\n\n' +
    'Reply 1 for Sell First or 3 for Help.'
  );
}