import { getCustomRepository, getRepository } from 'typeorm';
import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    // if category does not exist, create
    const categoryRepostitory = getRepository(Category);
    let categoryExist = await categoryRepostitory.findOne({
      where: { title: category },
    });
    if (!categoryExist) {
      categoryExist = categoryRepostitory.create({
        title: category,
      });
      await categoryRepostitory.save(categoryExist);
    }

    // check for balance to do this
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const transactions = await transactionsRepository.find();
    const balance = await transactionsRepository.getBalance(transactions);
    if (type === 'outcome' && balance.total < value) {
      throw new AppError('thre is no money to create this transaction.', 400);
    }

    // create transaction with category
    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryExist.id,
    });
    await transactionsRepository.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;
