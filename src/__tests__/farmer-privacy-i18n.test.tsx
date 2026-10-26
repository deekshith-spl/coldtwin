import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '@/App';
import { useStore } from '@/store/useStore';
import { en } from '@/i18n/en';
import { hi } from '@/i18n/hi';
import { te } from '@/i18n/te';

describe('Farmer Privacy & Localization', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('coldtwin_walkthrough_seen', 'true');
    useStore.getState().loadDemoData();
    useStore.setState({ isTourOpen: false });
  });

  it('Farmer role can only see their own report, not other farmers reports', () => {
    // Set role to farmer, active farmer is Raju Naidu (F1)
    useStore.setState({ role: 'farmer', currentFarmerId: 'F1' });
    window.history.pushState({}, '', '/reports');

    render(<App />);

    // Report container shows Raju Naidu
    const reportTitle = screen.getByText(/LOT STATUS REPORT/i);
    const reportContainer = (reportTitle.closest('div[class*="max-w-2xl"]') || reportTitle.parentElement!.parentElement!) as HTMLElement;

    expect(within(reportContainer).getByText('Raju Naidu')).toBeDefined();

    // Verify Sunita Devi (F2), Venkat Reddy (F3), Priya Kumari (F4) are NOT visible in report
    expect(within(reportContainer).queryByText('Sunita Devi')).toBeNull();
    expect(within(reportContainer).queryByText('Venkat Reddy')).toBeNull();
    expect(within(reportContainer).queryByText('Priya Kumari')).toBeNull();

    // Verify farmer selector dropdown is NOT shown to farmer
    expect(screen.queryByLabelText(/-- Choose a farmer --|Select Farmer/i)).toBeNull();
    expect(screen.queryByText(/Today's Sell-First List/i)).toBeNull();
  });

  it('Lots page for Farmer role displays only that farmer lots', () => {
    useStore.setState({ role: 'farmer', currentFarmerId: 'F1' });
    window.history.pushState({}, '', '/lots');

    render(<App />);

    // Farmer column is omitted for farmer view, and only F1 lots (L01, L04, L09) appear
    expect(screen.getByText('L01')).toBeDefined();
    expect(screen.getByText('L04')).toBeDefined();
    expect(screen.getByText('L09')).toBeDefined();

    // Other farmers lots like L02 (F2), L07 (F3), L10 (F2) must not appear
    expect(screen.queryByText('L02')).toBeNull();
    expect(screen.queryByText('L07')).toBeNull();
    expect(screen.queryByText('L10')).toBeNull();
  });

  it('i18n translation dictionaries (Telugu and Hindi) have all keys present in English', () => {
    const enKeys = Object.keys(en);
    const hiKeys = Object.keys(hi);
    const teKeys = Object.keys(te);

    const missingInHi = enKeys.filter(k => !(k in hi));
    const missingInTe = enKeys.filter(k => !(k in te));

    expect(missingInHi).toEqual([]);
    expect(missingInTe).toEqual([]);
  });

  it('renders UI properly when language is set to Telugu and Hindi', () => {
    useStore.setState({
      settings: {
        ...useStore.getState().settings,
        language: 'te',
      },
    });
    window.history.pushState({}, '', '/dashboard');

    const { unmount } = render(<App />);

    // Check Telugu navigation / header
    expect(screen.getAllByText('డాష్‌బోర్డ్').length).toBeGreaterThan(0);
    expect(screen.getByText('ముందుగా అమ్మండి')).toBeDefined();

    unmount();

    // Switch to Hindi
    useStore.setState({
      settings: {
        ...useStore.getState().settings,
        language: 'hi',
      },
    });

    render(<App />);
    expect(screen.getAllByText('डैशबोर्ड').length).toBeGreaterThan(0);
    expect(screen.getByText('पहले बेचें')).toBeDefined();
  });
});
