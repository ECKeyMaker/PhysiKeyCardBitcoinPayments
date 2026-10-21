import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { formatBtc } from '../functions/bitcoin';
import { explorerAddressUrl, explorerTxUrl } from '../functions/config';
import { getTransactions, type Transaction } from '../functions/esplora';
import { openWebView, type AppNavigation } from '../navigation';
import { fonts } from '../styles/common';

const RECENT_COUNT = 3;

type HistoryListProps = {
  address: string;
  refreshKey: number; // change to reload (for example after a refresh or a payment)
  navigation: AppNavigation;
};

const HistoryList: React.FC<HistoryListProps> = ({ address, refreshKey, navigation }) => {
  const { width } = useWindowDimensions();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getTransactions(address)
      .then(result => {
        if (active) {
          setTransactions(result);
          setFailed(false);
        }
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [address, refreshKey]);

  const renderBody = () => {
    if (failed) {
      return <Text style={styles.message}>Couldn't load transactions. Pull down to retry.</Text>;
    }
    if (transactions === null) {
      return <ActivityIndicator size="large" color="#000" style={styles.loading} />;
    }
    if (transactions.length === 0) {
      return <Text style={styles.message}>No transactions found.</Text>;
    }
    return transactions.slice(0, RECENT_COUNT).map(tx => (
      <Pressable key={tx.txid} style={styles.row} onPress={() => openWebView(navigation, explorerTxUrl(tx.txid), 'Transaction')}>
        <View>
          <Text style={styles.text}>
            {tx.netSats >= 0 ? '+' : ''}
            {formatBtc(tx.netSats)} BTC
          </Text>
          <Text style={styles.subText}>{tx.confirmed && tx.date ? tx.date.toLocaleDateString() : 'Pending'}</Text>
        </View>
        <Text style={styles.arrowText}>{'>'}</Text>
      </Pressable>
    ));
  };

  return (
    <View style={[styles.shadowContainer, { width: width * 0.8 }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Recent Transactions</Text>
          <Pressable onPress={() => openWebView(navigation, explorerAddressUrl(address), 'Wallet Transactions')} style={styles.viewAll}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </View>
        {renderBody()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    borderRadius: 16,
    marginVertical: 8,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerText: {
    fontSize: 20,
    color: '#000',
    fontFamily: fonts.body,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  text: {
    fontSize: 16,
    color: '#000',
    fontFamily: fonts.body,
  },
  subText: {
    fontSize: 13,
    color: '#666',
    fontFamily: fonts.body,
  },
  arrowText: {
    fontSize: 24,
    color: '#000',
    fontFamily: fonts.body,
  },
  viewAll: {
    padding: 8,
    backgroundColor: '#000',
    borderRadius: 15,
  },
  viewAllText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: fonts.body,
  },
  message: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    fontFamily: fonts.body,
    marginVertical: 20,
  },
  loading: {
    marginVertical: 20,
  },
});

export default HistoryList;
