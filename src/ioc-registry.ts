import { CacheService, CommonsPartyService } from '@republic-global/commons';
import {
  MQPublisher,
  crowdcraftQueueTopology,
  mqConnectionConfig,
  mqConnectionOpts,
  mqPublisherChannelOpts,
} from '@republic-global/commons-messaging';
import { container } from 'tsyringe';
import type InjectionToken from 'tsyringe/dist/typings/providers/injection-token';

export default class IOCRegistry {
  private static instance: IOCRegistry;
  private static mqPublisher: MQPublisher;

  private constructor() { }

  public static async getInstance(): Promise<IOCRegistry> {
    if (!IOCRegistry.instance) {
      IOCRegistry.instance = new IOCRegistry();
      await IOCRegistry.registerPublishers();
      await IOCRegistry.registerServices();
    }
    return IOCRegistry.instance;
  }

  private static async registerServices() {
    container.registerSingleton(CacheService);
    const cacheService = container.resolve(CacheService);

    container.register(CommonsPartyService, {
      useValue: new CommonsPartyService(cacheService),
    });
  }

  private static async registerPublishers() {
    IOCRegistry.mqPublisher = new MQPublisher({
      connectionConfig: mqConnectionConfig,
      topology: crowdcraftQueueTopology('storage', ['storage']),
      channelOpts: mqPublisherChannelOpts,
      connectionOpts: mqConnectionOpts,
    });
    container.registerInstance('mqPublisher', IOCRegistry.mqPublisher);
    await IOCRegistry.mqPublisher.initialize();
  }

  public getDependency<T>(token: InjectionToken<T>): T {
    return container.resolve<T>(token);
  }
}

