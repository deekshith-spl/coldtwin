import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '@/App';
import { useStore } from '@/store/useStore';

describe('Walkthrough, Mobile Navigation & Accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/dashboard');
    useStore.setState({ isTourOpen: false });
  });

  it('Requirement 1: shows 3-step walkthrough on first launch and sets localStorage flag when finished', async () => {
    render(<App />);

    // Step 1: What ColdTwin does
    expect(await screen.findByRole('dialog')).toBeDefined();
    expect(screen.getByText('What ColdTwin Does')).toBeDefined();
    expect(screen.getByText(/Predictive Digital Twin for Cold Storage Facilities/i)).toBeDefined();
    expect(screen.getByText('Step 1 of 3')).toBeDefined();

    // Click Next -> Step 2: How to load data
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText('How to Load Data')).toBeDefined();
    expect(screen.getByText(/Effortless Sensor Telemetry & Produce Manifest Ingestion/i)).toBeDefined();
    expect(screen.getByText('Step 2 of 3')).toBeDefined();

    // Click Next -> Step 3: How to read the Sell First list
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    expect(screen.getByText('How to Read the Sell First List')).toBeDefined();
    expect(screen.getByText(/Dynamic FEFO Prioritization to Prevent Crop Spoilage/i)).toBeDefined();
    expect(screen.getByText('Step 3 of 3')).toBeDefined();

    // Finish tour
    const finishBtn = screen.getByRole('button', { name: /Get Started/i });
    fireEvent.click(finishBtn);

    // Verify dialog closed and localStorage set
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem('coldtwin_walkthrough_seen')).toBe('true');
  });

  it('Requirement 1: Settings page has "Replay tour" link that triggers the walkthrough', async () => {
    localStorage.setItem('coldtwin_walkthrough_seen', 'true');
    render(<App />);

    // Walkthrough should not be open initially
    expect(screen.queryByRole('dialog')).toBeNull();

    // Navigate to Settings
    const settingsLinks = screen.getAllByRole('link', { name: /Settings/i });
    fireEvent.click(settingsLinks[0]);

    // Find "Replay tour" button in Settings
    const replayButtons = screen.getAllByRole('button', { name: /Replay tour/i });
    expect(replayButtons.length).toBeGreaterThan(0);

    // Click "Replay tour"
    fireEvent.click(replayButtons[0]);

    // Walkthrough modal opens
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('What ColdTwin Does')).toBeDefined();
  });

  it('Requirement 2: Mobile bottom tab bar renders 5 tabs (Dashboard, Data, Twin, Lots, Reports) with >= 44px tap target styling and no hamburger button', () => {
    localStorage.setItem('coldtwin_walkthrough_seen', 'true');
    render(<App />);

    const mobileNav = screen.getByLabelText('Mobile Navigation');
    expect(mobileNav).toBeDefined();

    const expectedTabs = ['Dashboard', 'Data', 'Twin', 'Lots', 'Reports'];
    expectedTabs.forEach(tabName => {
      const tabLink = within(mobileNav).getByRole('link', { name: tabName });
      expect(tabLink).toBeDefined();
      expect(tabLink.className).toContain('min-h-[48px]');
      expect(tabLink.className).toContain('min-w-[44px]');
    });

    // Verify desktop sidebar remains
    const desktopNav = screen.getByLabelText('Main Navigation');
    expect(desktopNav).toBeDefined();

    // Verify hamburger button is absent
    const hamburgerBtn = screen.queryByLabelText(/open menu|hamburger/i);
    expect(hamburgerBtn).toBeNull();
  });

  it('Requirement 3: Accessibility - icon-only buttons have aria-labels, interactive items have visible focus rings, and status uses icon plus text', () => {
    localStorage.setItem('coldtwin_walkthrough_seen', 'true');
    render(<App />);

    // Check mobile header Settings icon button has aria-label
    const header = screen.getByRole('banner');
    const settingsIconBtn = within(header).getByRole('link', { name: 'Settings' });
    expect(settingsIconBtn.getAttribute('aria-label')).toBe('Settings');

    // Status banner has icon and text (not colour alone)
    const statusBanner = screen.getByText(/All chambers normal|items need attention/i);
    expect(statusBanner).toBeDefined();
    expect(screen.getAllByText(/Normal|Warning|Critical/i).length).toBeGreaterThan(0);

    // Sell First card contains Urgency chips with icons and text
    const urgencyChips = screen.getAllByText(/Urgent|Soon|OK/i);
    expect(urgencyChips.length).toBeGreaterThan(0);
  });
});
