import { type Disposable, singleton } from 'tsyringe';
import { DataSource } from 'typeorm';
import SnakeCaseNamingStrategy from '@/commons/typeorm/snake-case-naming-strategy';
import WinstonTypeOrmLogger from '@/commons/typeorm/winston-typeorm-logger';
import LoggerFactory from '@/commons/utils/logger-factory';
import { config } from '@/config';

import { Payment, PaymentAccount, Payout } from '@/entities';

@singleton()
export default class DB implements Disposable {
  private readonly logger = LoggerFactory.getLogger('DB');
  private readonly primaryDataSource: DataSource;
  static ts: any;

  constructor() {
    this.primaryDataSource = new DataSource({
      ...config.dbConfig,
      type: 'postgres',
      synchronize: true,
      logging: true,
      entities: [Payment, PaymentAccount, Payout],
      migrations: [],
      subscribers: [],
      logger: new WinstonTypeOrmLogger(
        LoggerFactory.getLogger('typeorm'),
        'all'
      ),
      namingStrategy: new SnakeCaseNamingStrategy(),
      entitySkipConstructor: true,
      dropSchema: false,
    });
  }

  public getPrimaryDataSource(): DataSource {
    return this.primaryDataSource;
  }

  async dispose() {
    this.logger.info('Disposing typeorm datasource....');
    await this.primaryDataSource.destroy();
  }
}
