/**
 * @typedef {Object} ApiError
 * @property {string} code
 * @property {string} message
 */

/**
 * @template TData
 * @template TMeta
 * @typedef {Object} ApiResponse
 * @property {boolean} ok
 * @property {TData} data
 * @property {TMeta} [meta]
 * @property {ApiError} [error]
 */

/**
 * @typedef {Object} Pagination
 * @property {number} page
 * @property {number} pageSize
 * @property {number} total
 */

/**
 * @typedef {Object} PagedMeta
 * @property {Pagination} pagination
 */

// --- Dashboard ---

/**
 * @typedef {Object} DashboardSummary
 * @property {number} storesTotal
 * @property {Object} eod
 * @property {string} eod.date
 * @property {number} eod.done
 * @property {number} eod.pending
 * @property {number} eod.failed
 * @property {string} eod.lastSyncAt
 * @property {number} interactionsToday
 * @property {Object} backups
 * @property {number} backups.available
 * @property {string} backups.latestAt
 * @property {Object} employees
 * @property {number} employees.total
 * @property {number} employees.branches
 * @property {string|null} employees.syncedAt
 * @property {'OK' | 'WARNING' | 'CRITICAL'} systemHealth
 */

/**
 * @typedef {Object} Alert
 * @property {string} id
 * @property {'EOD_MISSED' | 'EOD_FAILED' | 'BACKUP_FAILED' | 'DISK_LOW' | 'SERVICE_DOWN'} type
 * @property {'LOW' | 'MEDIUM' | 'HIGH'} severity
 * @property {string} title
 * @property {string} createdAt
 */

// --- EOD ---

/**
 * @typedef {'done' | 'pending' | 'failed'} EodStatus
 */

/**
 * @typedef {Object} EodStoreRow
 * @property {string} storeId
 * @property {string} storeCode
 * @property {string} storeName
 * @property {string} areaId
 * @property {string} areaName
 * @property {EodStatus} status
 * @property {string|null} lastEodAt
 * @property {string} lastSyncAt
 * @property {'bot' | 'api' | 'manual' | null} source
 * @property {string|null} errorMessage
 */

/**
 * @typedef {Object} EodAreaRow
 * @property {string} areaId
 * @property {string} areaName
 * @property {number} storesTotal
 * @property {number} done
 * @property {number} pending
 * @property {number} failed
 * @property {number} completionRate
 */

// --- Stores ---

/**
 * @typedef {'active' | 'inactive'} StoreStatus
 */

/**
 * @typedef {Object} StoreRow
 * @property {string} storeId
 * @property {string} storeCode
 * @property {string} storeName
 * @property {string} areaId
 * @property {string} [areaName]
 * @property {string} address
 * @property {string} [picName]
 * @property {string} [phone]
 * @property {StoreStatus} status
 */

// --- Identity ---

/**
 * @typedef {Object} IdentityRow
 * @property {string} id
 * @property {string} nik
 * @property {string} fullName
 * @property {string} [role]
 * @property {string} [storeCode]
 * @property {string} [storeName]
 * @property {string} [branchId]
 * @property {string} [branchName]
 * @property {'ACTIVE' | 'INACTIVE'} status
 * @property {string|null} lastActivity
 */

// --- Backups ---

/**
 * @typedef {Object} BackupSummary
 * @property {number} count
 * @property {number} totalSizeBytes
 * @property {string|null} latestBackupAt
 * @property {string|null} latestFileName
 * @property {string} storagePath
 */

/**
 * @typedef {Object} BackupFile
 * @property {string} fileName
 * @property {'scheduled' | 'manual' | 'unknown'} type
 * @property {string|null} date
 * @property {number} sizeBytes
 * @property {string} modifiedAt
 */

// --- System ---

/**
 * @typedef {Object} SystemOverview
 * @property {string} hostname
 * @property {string} platform
 * @property {number} uptimeSeconds
 * @property {number[]} loadavg
 * @property {Object} memory
 * @property {number} memory.totalBytes
 * @property {number} memory.freeBytes
 * @property {Object|null} [disk]
 * @property {number} disk.totalBytes
 * @property {number} disk.freeBytes
 * @property {number} disk.usedBytes
 * @property {number} disk.usedPercent
 * @property {string} [timezone]
 * @property {string} generatedAt
 */

/**
 * @typedef {Object} SystemService
 * @property {string} name
 * @property {'ONLINE' | 'DEGRADED' | 'UNKNOWN'} status
 * @property {string} lastCheckedAt
 */

/**
 * @typedef {Object} SystemLogRow
 * @property {string} id
 * @property {'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'} level
 * @property {string} component
 * @property {string} message
 * @property {string} createdAt
 */

export {};
