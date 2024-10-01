import {
    // CacheService,
    // CommonsPartyService,
    LoggerFactory,
    // commonsConfig,
} from '@republic-global/commons';
import {
    MQPublisher,
    // crowdcraftQueueTopology,
    // mqConnectionConfig,
    // mqConnectionOpts,
    // mqPublisherChannelOpts,
} from '@republic-global/commons-messaging';
import { container } from 'tsyringe';
import type InjectionToken from 'tsyringe/dist/typings/providers/injection-token';


import DB from '@/infrastructure/db.ts';

export type ApplicationMode = 'server' | 'cron';

export default class IOCRegistry {
    private static readonly logger = LoggerFactory.getLogger('IOCRegistry');
    private static initialized = false;
    private static mqPublisher: MQPublisher;
    private static db: DB;
    // private static cacheService: CacheService;

    public static async initialize(mode: ApplicationMode): Promise<void> {
        if (IOCRegistry.initialized) {
            throw new Error('IOC Registry already initialized');
        }
        await IOCRegistry.registerRepositories();
        // await IOCRegistry.registerServices();
        if (mode === 'server') {
            // await IOCRegistry.registerPublishers();
        } else {
            container.registerInstance('mqPublisher', {});
        }
        IOCRegistry.initialized = true;
    }

    public static getDependency<T>(token: InjectionToken<T>): T {
        return container.resolve<T>(token);
    }

    private static async registerRepositories() {
        // Repositories
        IOCRegistry.db = container.resolve(DB);
        await IOCRegistry.db.getPrimaryDataSource().initialize();
    }

    // private static async registerServices() {
    //     container.registerSingleton(CacheService);
    //     IOCRegistry.cacheService = container.resolve(CacheService);
    //     container.register(CommonsPartyService, {
    //         useValue: new CommonsPartyService(IOCRegistry.cacheService),
    //     });
    // }

    // private static async registerPublishers() {
    //     IOCRegistry.mqPublisher = new MQPublisher({
    //         connectionConfig: mqConnectionConfig,
    //         topology: crowdcraftQueueTopology('notification', [
    //             commonsConfig.queues.notification,
    //         ]),
    //         channelOpts: mqPublisherChannelOpts,
    //         connectionOpts: mqConnectionOpts,
    //     });
    //     container.registerInstance('mqPublisher', IOCRegistry.mqPublisher);
    //     await IOCRegistry.mqPublisher.initialize();
    // }

    public static async dispose() {
        IOCRegistry.logger.info('Disposing container registry');
        await IOCRegistry.mqPublisher?.dispose();
        // automatically called -
        // await IOCRegistry.cacheService.dispose();
        // await IOCRegistry.db.dispose();
        await container.dispose();
    }
}
