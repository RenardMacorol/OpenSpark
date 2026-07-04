import { Timestamp } from 'firebase/firestore'

// ---------------------------------------------------------------------------
// Enums / literal unions
// ---------------------------------------------------------------------------

export type UserRole = 'beginner' | 'admin'
export type EventStatus = 'upcoming' | 'active' | 'closed'
export type NotificationType =
	| 'team_join'
	| 'cycle_start'
	| 'deadline_soon'
	| 'submission_received'

// ---------------------------------------------------------------------------
// Firestore document interfaces
// ---------------------------------------------------------------------------

/** users/{uid} */
export interface User {
	uid: string
	displayName: string
	avatarUrl: string
	githubUsername: string
	techStack: string[]
	timezone: string
	role: UserRole
	createdAt: Timestamp
}

/** cycles/{cycleId} */
export interface Cycle {
	id: string
	title: string
	description: string
	requirements: string[]
	startDate: Timestamp
	endDate: Timestamp
	status: EventStatus
	createdBy: string
}

/** hackathons/{hackathonId} */
export interface Hackathon {
	id: string
	theme: string
	description: string
	startDate: Timestamp
	endDate: Timestamp
	status: EventStatus
	createdBy: string
}

/** teams/{teamId} */
export interface Team {
	id: string
	cycleId?: string
	hackathonId?: string
	name: string
	members: string[]
	maxSize: number
	techStack: string[]
	isOpen: boolean
	createdBy: string
	createdAt: Timestamp
}

/** teams/{teamId}/messages/{messageId} */
export interface Message {
	id: string
	authorUid: string
	text: string
	createdAt: Timestamp
}

/** submissions/{submissionId} */
export interface Submission {
	id: string
	teamId: string
	cycleId?: string
	hackathonId?: string
	repoUrl: string
	demoUrl?: string
	description: string
	submittedAt: Timestamp
	submittedBy: string
}

/** notifications/{uid}/feed/{notifId} */
export interface Notification {
	id: string
	type: NotificationType
	message: string
	read: boolean
	createdAt: Timestamp
}
