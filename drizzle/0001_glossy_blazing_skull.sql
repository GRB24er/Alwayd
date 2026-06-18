CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountNumber` varchar(20) NOT NULL,
	`routingNumber` varchar(12),
	`type` enum('checking','savings','investment') NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`balance` decimal(18,2) NOT NULL DEFAULT '0.00',
	`availableBalance` decimal(18,2) NOT NULL DEFAULT '0.00',
	`isActive` boolean NOT NULL DEFAULT true,
	`interestRate` decimal(5,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `accounts_accountNumber_unique` UNIQUE(`accountNumber`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(64) NOT NULL,
	`resource` varchar(64) NOT NULL,
	`resourceId` varchar(64),
	`detail` text,
	`ipAddress` varchar(45),
	`userAgent` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beneficiaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`nickname` varchar(64),
	`accountNumber` varchar(34) NOT NULL,
	`routingNumber` varchar(12),
	`bankName` varchar(256),
	`swiftCode` varchar(11),
	`country` varchar(2) NOT NULL DEFAULT 'US',
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `beneficiaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fromAccountId` int NOT NULL,
	`beneficiaryId` int,
	`type` enum('internal','external','wire','international') NOT NULL,
	`amount` decimal(18,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`description` text,
	`frequency` enum('once','daily','weekly','biweekly','monthly','quarterly','yearly') NOT NULL,
	`nextRunAt` timestamp NOT NULL,
	`lastRunAt` timestamp,
	`endsAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`runCount` int NOT NULL DEFAULT 0,
	`maxRuns` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`userId` int NOT NULL,
	`reference` varchar(32) NOT NULL,
	`type` enum('deposit','withdrawal','transfer-in','transfer-out','payment','fee','interest','refund') NOT NULL,
	`amount` decimal(18,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`description` text NOT NULL,
	`status` enum('pending','posted','completed','failed','reversed') NOT NULL DEFAULT 'pending',
	`balanceAfter` decimal(18,2),
	`transferId` int,
	`metadata` text,
	`date` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `transactions_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reference` varchar(32) NOT NULL,
	`idempotencyKey` varchar(64),
	`type` enum('internal','external','wire','international') NOT NULL,
	`status` enum('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`fromAccountId` int NOT NULL,
	`toAccountId` int,
	`amount` decimal(18,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`fee` decimal(18,2) NOT NULL DEFAULT '0.00',
	`description` text,
	`recipientName` varchar(256),
	`recipientAccount` varchar(34),
	`recipientBank` varchar(256),
	`recipientRoutingNumber` varchar(12),
	`swiftCode` varchar(11),
	`country` varchar(2),
	`failureReason` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transfers_id` PRIMARY KEY(`id`),
	CONSTRAINT `transfers_reference_unique` UNIQUE(`reference`),
	CONSTRAINT `xfer_idempotency_idx` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `firstName` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `lastName` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `verified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `kycStatus` enum('none','pending','approved','rejected') DEFAULT 'none' NOT NULL;--> statement-breakpoint
CREATE INDEX `accounts_userId_idx` ON `accounts` (`userId`);--> statement-breakpoint
CREATE INDEX `accounts_type_idx` ON `accounts` (`type`);--> statement-breakpoint
CREATE INDEX `audit_userId_idx` ON `audit_logs` (`userId`);--> statement-breakpoint
CREATE INDEX `audit_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `audit_resource_idx` ON `audit_logs` (`resource`);--> statement-breakpoint
CREATE INDEX `audit_createdAt_idx` ON `audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `bene_userId_idx` ON `beneficiaries` (`userId`);--> statement-breakpoint
CREATE INDEX `sched_userId_idx` ON `scheduled_payments` (`userId`);--> statement-breakpoint
CREATE INDEX `sched_nextRun_idx` ON `scheduled_payments` (`nextRunAt`);--> statement-breakpoint
CREATE INDEX `sched_active_idx` ON `scheduled_payments` (`isActive`);--> statement-breakpoint
CREATE INDEX `txn_accountId_idx` ON `transactions` (`accountId`);--> statement-breakpoint
CREATE INDEX `txn_userId_idx` ON `transactions` (`userId`);--> statement-breakpoint
CREATE INDEX `txn_date_idx` ON `transactions` (`date`);--> statement-breakpoint
CREATE INDEX `txn_status_idx` ON `transactions` (`status`);--> statement-breakpoint
CREATE INDEX `txn_type_idx` ON `transactions` (`type`);--> statement-breakpoint
CREATE INDEX `xfer_userId_idx` ON `transfers` (`userId`);--> statement-breakpoint
CREATE INDEX `xfer_status_idx` ON `transfers` (`status`);