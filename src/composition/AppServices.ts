import { type Clock } from '@/core/clock/Clock';
import { type AppConfig } from '@/core/config/env';
import { type SqlDriver } from '@/core/db/SqlDriver';
import { type IdGenerator } from '@/core/lib/id';
import { createEmitter, type Emitter } from '@/core/lib/store';
import { type Speaker } from '@/core/speech/Speaker';
import { type SpeechRecognizer } from '@/core/speech/SpeechRecognizer';
import { createEntitlementRepository } from '@/features/billing/data/entitlementRepository';
import { type Billing } from '@/features/billing/engine/Billing';
import {
  createEntitlementService,
  type EntitlementService,
} from '@/features/billing/engine/entitlementService';
import {
  createConversationRepository,
  type ConversationRepository,
} from '@/features/conversation/data/conversationRepository';
import { type Tutor } from '@/features/conversation/engine/Tutor';
import {
  createProfileRepository,
  type ProfileRepository,
} from '@/features/onboarding/data/profileRepository';
import { type ReminderScheduler } from '@/features/progress/data/reminderScheduler';
import {
  createProgressRepository,
  type ProgressRepository,
} from '@/features/progress/data/progressRepository';
import {
  createProgressService,
  type ProgressService,
} from '@/features/progress/engine/progressService';
import {
  createReviewRepository,
  type ReviewRepository,
} from '@/features/review/data/reviewRepository';
import { createReviewService, type ReviewService } from '@/features/review/engine/reviewService';
import { createScheduler, type Scheduler } from '@/features/review/lib/scheduler';
import { type StreakWidgetProps } from '@/features/widget/lib/streakSnapshot';

/** What changed, so screens re-read only what they show. */
export type ChangeTopic = 'profile' | 'progress' | 'review' | 'conversation' | 'entitlement';

/**
 * Everything the app depends on, built once at the composition root and
 * handed down through ServicesProvider. Native and test builds differ only
 * in the ports passed to `assembleServices`; the services on top are shared.
 */
export type AppServices = {
  config: Pick<AppConfig, 'demo'>;
  clock: Clock;
  ids: IdGenerator;
  db: SqlDriver;
  profiles: ProfileRepository;
  progressRepo: ProgressRepository;
  conversations: ConversationRepository;
  reviewRepo: ReviewRepository;
  scheduler: Scheduler;
  progress: ProgressService;
  review: ReviewService;
  entitlement: EntitlementService;
  billing: Billing;
  tutor: Tutor;
  recognizer: SpeechRecognizer;
  speaker: Speaker;
  reminders: ReminderScheduler;
  publishWidget: (props: StreakWidgetProps) => void;
  changes: Emitter<ChangeTopic>;
};

export type Ports = {
  config: Pick<AppConfig, 'demo'>;
  clock: Clock;
  ids: IdGenerator;
  db: SqlDriver;
  billing: Billing;
  tutor: Tutor;
  recognizer: SpeechRecognizer;
  speaker: Speaker;
  reminders: ReminderScheduler;
  publishWidget: (props: StreakWidgetProps) => void;
  fuzz?: boolean;
};

export function assembleServices(ports: Ports): AppServices {
  const { db, ids, clock } = ports;
  const profiles = createProfileRepository(db);
  const progressRepo = createProgressRepository(db, ids);
  const conversations = createConversationRepository(db, ids);
  const reviewRepo = createReviewRepository(db, ids);
  const scheduler = createScheduler({ fuzz: ports.fuzz ?? true });
  const entitlement = createEntitlementService({
    billing: ports.billing,
    repository: createEntitlementRepository(db),
    clock,
  });
  return {
    ...ports,
    profiles,
    progressRepo,
    conversations,
    reviewRepo,
    scheduler,
    entitlement,
    progress: createProgressService({ progress: progressRepo, profiles, clock }),
    review: createReviewService({
      repository: reviewRepo,
      scheduler,
      clock,
      isPro: () => entitlement.hasPro(),
    }),
    changes: createEmitter<ChangeTopic>(),
  };
}
