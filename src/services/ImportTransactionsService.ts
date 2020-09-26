import fs from 'fs';
import csvParser from 'csv-parse';
import { getCustomRepository, getRepository, In } from 'typeorm';
import Category from '../models/Category';
import TransactionRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';

interface CSVtransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}
class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    // read and import css
    // to skip the first line of titles: form_line 2
    // for book insert, save everything here, then just connect once with db and pass this one, instead of inserting one at a time
    const contactsReadStream = fs.createReadStream(filePath);
    const parsers = csvParser({
      from_line: 2,
    });
    const parseCSV = contactsReadStream.pipe(parsers);
    const transactions: CSVtransaction[] = [];
    const categories: string[] = [];
    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      // update arrays
      if (!title || !type || !value) return;
      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve)); // espera o evento end do parse ser emitido

    // if I used methods that already exist, I would have to look at them one at a time, but as a book insert use in to look at all
    // get those in the db that are inside the categories of the file that are now in the array
    // then take the titles of the existing ones
    // then take the title of nonexistent
    // eliminates duplication
    // create all instances at once, save data at once from categories
    const categoryRepository = getRepository(Category);
    const existentCategories = await categoryRepository.find({
      where: { title: In(categories) },
    });
    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );
    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);
    const newCategories = categoryRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );
    await categoryRepository.save(newCategories);

    // generate array with all csv categories
    const finalCategories = [...newCategories, ...existentCategories];

    // create and save as a array, at once transactions
    const transactionRepository = getCustomRepository(TransactionRepository);
    const createdTransactions = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );
    await transactionRepository.save(createdTransactions);

    // delete imported file
    await fs.promises.unlink(filePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
