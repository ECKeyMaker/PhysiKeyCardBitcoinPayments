/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders the landing screen', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const text = JSON.stringify(renderer!.toJSON());
  expect(text).toContain('Accept Card Payment');
  expect(text).toContain('Card Management');
  expect(text).toContain('TESTNET');
});
