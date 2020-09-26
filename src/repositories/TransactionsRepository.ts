import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(transactions: Transaction[]): Promise<Balance> {
    let income = 0;
    let outcome = 0;
    let total = 0;

    transactions.map(transaction => {
      if (transaction.type === 'income') {
        income += Number(transaction.value);
        total += Number(transaction.value);
      }
      if (transaction.type === 'outcome') {
        outcome += Number(transaction.value);
        total -= Number(transaction.value);
      }
      return transaction; // because you need to return an object
    });

    const balance: Balance = { income, outcome, total };
    return balance;
  }
}

export default TransactionsRepository;
