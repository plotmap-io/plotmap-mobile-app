import { describe, expect, it } from 'vitest';

import { addressLine, humanise, statusLabel } from '../src/lib/display';

describe('statusLabel', () => {
  it('says the four server statuses the way a person does', () => {
    expect(statusLabel('ForSale')).toBe('For sale');
    expect(statusLabel('ForRent')).toBe('For rent');
    expect(statusLabel('Sold')).toBe('Sold');
    expect(statusLabel('Rented')).toBe('Rented');
  });

  it('splits an unknown camel-case status rather than printing the enum', () => {
    expect(statusLabel('UnderOffer')).toBe('Under Offer');
  });

  it('is empty for a missing status', () => {
    expect(statusLabel(undefined)).toBe('');
  });
});

describe('humanise', () => {
  it('turns a catalogue key into a sentence-case phrase', () => {
    expect(humanise('residential_plot')).toBe('Residential plot');
    expect(humanise('APARTMENT')).toBe('Apartment');
    expect(humanise('mixed-use')).toBe('Mixed use');
  });

  it('is empty for a missing value', () => {
    expect(humanise(undefined)).toBe('');
  });
});

describe('addressLine', () => {
  it('flattens the newline-separated line the server composes', () => {
    expect(addressLine('Kuranchery - Velur Road\nMinalur\nWadakkancherry\nThrissur Dist.')).toBe(
      'Kuranchery - Velur Road, Minalur, Wadakkancherry, Thrissur Dist.',
    );
  });

  it('drops empty lines and survives nothing at all', () => {
    expect(addressLine('Punkunnam\n\nThrissur Dist.')).toBe('Punkunnam, Thrissur Dist.');
    expect(addressLine(undefined)).toBe('');
    expect(addressLine('')).toBe('');
  });
});
