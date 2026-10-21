import { StyleSheet } from 'react-native';

// Open-licensed (SIL OFL 1.1, see LICENSES/). Each name is the font's PostScript name and its
// filename in src/assets/fonts, so it resolves on both iOS and Android.
export const fonts = {
  title: 'Michroma-Regular',
  body: 'Figtree-Medium',
};

export const colors = {
  text: '#000',
  textOnBackground: '#fff',
  muted: '#666',
  placeholder: '#999',
  border: '#ccc',
  error: '#c00',
  sheet: '#fff',
  backdrop: 'rgba(0, 0, 0, 0.5)',
};

/** Shared styles for the bottom-sheet flows in src/components. */
export const sheet = StyleSheet.create({
  title: {
    fontFamily: fonts.title,
    fontSize: 24,
    margin: 16,
    textAlign: 'center',
    color: colors.text,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 8,
    alignSelf: 'stretch',
    color: colors.text,
  },
  mutedText: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 8,
    color: colors.muted,
  },
  inputContainer: {
    width: '90%',
    marginVertical: 6,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 5,
    color: colors.text,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    minHeight: 56,
    width: '100%',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.sheet,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: fonts.body,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    fontFamily: fonts.body,
  },
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});
