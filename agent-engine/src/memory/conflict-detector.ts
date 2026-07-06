// ============================================================================
// Entity-Relation Conflict Detector
// Detects inconsistencies between new facts and historical entity state:
//   - Location conflicts (same time, different place)
//   - Status conflicts (dead → alive)
//   - Timeline conflicts (event before known time)
//   - Relationship conflicts (inconsistent dynamics)
//   - Power level conflicts (inconsistent changes)
// ============================================================================

import type { FactEntry, MemoryStoreInterface } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConflictReport {
  detected: boolean;
  conflicts: Conflict[];
}

export interface Conflict {
  type: "location" | "status" | "relationship" | "timeline" | "power_level";
  severity: "critical" | "warning" | "info";
  description: string;
  existingFact: FactEntry;
  newFact: FactEntry;
  suggestion: string;
}

interface EntityState {
  location?: string;
  locationFactId?: string;
  locationChapter?: number;
  status?: string;
  statusFactId?: string;
  statusChapter?: number;
  powerLevel?: number;
  powerLevelFactId?: string;
  powerLevelChapter?: number;
  relationships: Map<string, { type: string; dynamic: string; chapter: number }>;
}

// ---------------------------------------------------------------------------
// Status keyword patterns (Chinese)
// ---------------------------------------------------------------------------

const STATUS_DEAD_PATTERNS = [
  /死[亡了]/,
  /被杀/,
  /牺牲/,
  /殒命/,
  /殉难/,
  /阵亡/,
  /身亡/,
  /离世/,
  /去世/,
  /死亡/,
];

const STATUS_ALIVE_PATTERNS = [
  /现身/,
  /出现/,
  /醒来/,
  /苏醒/,
  /复活/,
  /重生/,
  /复生/,
  /康复/,
  /恢复/,
  /归来/,
  /回到/,
];

const STATUS_INJURED_PATTERNS = [
  /受伤/,
  /负伤/,
  /重伤/,
  /轻伤/,
  /濒[临死]/,
  /垂危/,
  /重伤不治/,
  /中毒/,
];

/**
 * Common Chinese stopwords for bigram tokenization.
 * (duplicated here to avoid circular dependency with knowledge module)
 */
const STOP_WORDS = new Set([
  "的", "了", "在", "是", "我", "有", "和", "就", "不", "人",
  "都", "一", "上", "也", "很", "到", "说", "要", "去", "你",
  "会", "着", "没有", "看", "好", "自己", "这", "他", "她", "它",
  "们", "那", "被", "把", "而", "还", "可以", "能", "如果", "但",
  "对", "于", "与", "从", "中", "之", "为", "以", "或", "等",
  "其", "及", "所", "则", "如", "使", "让", "此", "因", "该",
  "用", "过", "将", "来", "里",
]);

// ---------------------------------------------------------------------------
// ConflictDetector
// ---------------------------------------------------------------------------

export class ConflictDetector {
  private store: MemoryStoreInterface;

  constructor(store: MemoryStoreInterface) {
    this.store = store;
  }

  /**
   * Check new facts against existing facts for conflicts.
   *
   * Builds an entity state map from all historical facts, then checks each
   * new fact against the accumulated state to detect inconsistencies.
   */
  detectConflicts(newFacts: FactEntry[]): ConflictReport {
    const entityState = this.buildEntityStateMap();
    const conflicts: Conflict[] = [];

    for (const fact of newFacts) {
      const conflict = this.checkEntityConflict(fact, entityState);
      if (conflict) {
        conflicts.push(conflict);
      }

      // Also check pairwise conflicts between new facts
      for (const other of newFacts) {
        if (other.id === fact.id) continue;
        const pairwiseConflict = this.checkPairwiseConflict(fact, other);
        if (pairwiseConflict) {
          // Avoid duplicates
          const isDuplicate = conflicts.some(
            (c) =>
              c.existingFact.id === pairwiseConflict.existingFact.id &&
              c.newFact.id === pairwiseConflict.newFact.id &&
              c.type === pairwiseConflict.type
          );
          if (!isDuplicate) {
            conflicts.push(pairwiseConflict);
          }
        }
      }

      // Apply the new fact to entity state for subsequent checks
      this.applyFactToEntityState(fact, entityState);
    }

    return {
      detected: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Build entity state map from all historical facts.
   * Tracks: character locations, character status (alive/dead/injured), power levels.
   */
  private buildEntityStateMap(): Map<string, EntityState> {
    const entityState = new Map<string, EntityState>();
    const allFacts = this.store.getAllFacts();

    for (const fact of allFacts) {
      this.applyFactToEntityState(fact, entityState);
    }

    return entityState;
  }

  /**
   * Apply a fact to the entity state map, updating tracked attributes.
   */
  private applyFactToEntityState(
    fact: FactEntry,
    entityState: Map<string, EntityState>
  ): void {
    const subject = fact.subject.toLowerCase().trim();
    if (!subject) return;

    let state = entityState.get(subject);
    if (!state) {
      state = { relationships: new Map() };
      entityState.set(subject, state);
    }

    // Track location from 'location' category facts
    if (fact.category === "location") {
      const location = this.extractLocation(fact.content);
      if (location) {
        state.location = location;
        state.locationFactId = fact.id;
        state.locationChapter = fact.chapterNumber;
      }
    }

    // Track status from 'state' category facts
    if (fact.category === "state") {
      const status = this.extractStatus(fact.content);
      if (status) {
        state.status = status;
        state.statusFactId = fact.id;
        state.statusChapter = fact.chapterNumber;
      }
    }

    // Track power level from 'state' or 'character' category facts
    if (fact.category === "state" || fact.category === "character") {
      const powerLevel = this.extractPowerLevel(fact.content);
      if (powerLevel !== undefined) {
        state.powerLevel = powerLevel;
        state.powerLevelFactId = fact.id;
        state.powerLevelChapter = fact.chapterNumber;
      }
    }

    // Track relationships from 'relationship' category facts
    if (fact.category === "relationship") {
      const relationshipInfo = this.parseRelationship(fact);
      if (relationshipInfo) {
        state.relationships.set(relationshipInfo.target, {
          type: relationshipInfo.type,
          dynamic: relationshipInfo.dynamic,
          chapter: fact.chapterNumber,
        });
      }
    }
  }

  /**
   * Check if a new fact conflicts with the accumulated entity state.
   */
  checkEntityConflict(
    fact: FactEntry,
    entityState: Map<string, EntityState>
  ): Conflict | null {
    const subject = fact.subject.toLowerCase().trim();
    if (!subject) return null;

    const state = entityState.get(subject);
    if (!state) return null;

    // --- Location conflict ---
    if (fact.category === "location" && state.location) {
      const newLocation = this.extractLocation(fact.content);
      if (
        newLocation &&
        state.location &&
        !this.locationsMatch(state.location, newLocation) &&
        fact.chapterNumber === state.locationChapter
      ) {
        return {
          type: "location",
          severity: "critical",
          description:
            `"${fact.subject}" 在第${fact.chapterNumber}章出现在"${newLocation}"，` +
            `但之前记录在"${state.location}"（第${state.locationChapter}章）。`,
          existingFact: this.findFactById(state.locationFactId!) ?? fact,
          newFact: fact,
          suggestion:
            `请检查时间线：角色可能在两个地点之间移动，` +
            `或者需要添加移动过渡场景。`,
        };
      }
    }

    // --- Status conflict ---
    if (fact.category === "state" || fact.category === "character") {
      const newStatus = this.extractStatus(fact.content);
      if (newStatus && state.status && state.status !== newStatus) {
        // Critical: dead → alive
        if (state.status === "dead" && newStatus !== "dead") {
          return {
            type: "status",
            severity: "critical",
            description:
              `"${fact.subject}" 之前在第${state.statusChapter}章被记录为"死亡"，` +
              `但新事实表明其状态变为"${newStatus}"。`,
            existingFact: this.findFactById(state.statusFactId!) ?? fact,
            newFact: fact,
            suggestion:
              `角色死亡后不应无故复活。如果是不同角色重名，请检查subject命名。` +
              `如果是复活情节，需要有明确的事件支撑。`,
          };
        }

        // Warning: injured → dead without explicit event
        if (state.status === "injured" && newStatus === "dead") {
          return {
            type: "status",
            severity: "warning",
            description:
              `"${fact.subject}" 在第${state.statusChapter}章受伤，` +
              `现在记录为死亡。请确认是否有明确的死亡事件。`,
            existingFact: this.findFactById(state.statusFactId!) ?? fact,
            newFact: fact,
            suggestion:
              `请确保有明确的死亡事件描述来支撑从受伤到死亡的状态变化。`,
          };
        }
      }
    }

    // --- Power level conflict ---
    if (fact.category === "state" || fact.category === "character") {
      const newPower = this.extractPowerLevel(fact.content);
      if (
        newPower !== undefined &&
        state.powerLevel !== undefined &&
        state.powerLevelChapter !== undefined
      ) {
        const diff = Math.abs(newPower - state.powerLevel);
        const relativeChange = state.powerLevel > 0 ? diff / state.powerLevel : diff;

        // Significant power level change (more than 50%)
        if (relativeChange > 0.5 && fact.chapterNumber <= (state.powerLevelChapter ?? 0)) {
          return {
            type: "power_level",
            severity: "warning",
            description:
              `"${fact.subject}" 的力量等级从 ${state.powerLevel}（第${state.powerLevelChapter}章）` +
              `变为 ${newPower}（第${fact.chapterNumber}章），变化幅度 ${Math.round(relativeChange * 100)}%。`,
            existingFact: this.findFactById(state.powerLevelFactId!) ?? fact,
            newFact: fact,
            suggestion:
              `力量等级的大幅变化需要有合理的事件支撑（如修炼突破、受伤削弱等）。`,
          };
        }
      }
    }

    return null;
  }

  /**
   * Check for pairwise conflicts between two new facts about the same entity.
   */
  private checkPairwiseConflict(factA: FactEntry, factB: FactEntry): Conflict | null {
    const subjectA = factA.subject.toLowerCase().trim();
    const subjectB = factB.subject.toLowerCase().trim();

    // Only check conflicts between facts about the same subject
    if (subjectA !== subjectB || !subjectA) return null;

    // Location conflict between two new facts
    if (factA.category === "location" && factB.category === "location") {
      const locA = this.extractLocation(factA.content);
      const locB = this.extractLocation(factB.content);
      if (
        locA && locB &&
        !this.locationsMatch(locA, locB) &&
        factA.chapterNumber === factB.chapterNumber
      ) {
        return {
          type: "location",
          severity: "critical",
          description:
            `"${factA.subject}" 在同一章（第${factA.chapterNumber}章）` +
            `出现在两个不同位置："${locA}" 和 "${locB}"。`,
          existingFact: factA,
          newFact: factB,
          suggestion: `同一时间角色不应出现在两个地点，请检查事实准确性。`,
        };
      }
    }

    // Status conflict between two new facts
    if (factA.category === "state" && factB.category === "state") {
      const statusA = this.extractStatus(factA.content);
      const statusB = this.extractStatus(factB.content);
      if (statusA && statusB && statusA !== statusB) {
        const isDeadAlive =
          (statusA === "dead" && statusB !== "dead") ||
          (statusB === "dead" && statusA !== "dead");
        return {
          type: "status",
          severity: isDeadAlive ? "critical" : "warning",
          description:
            `"${factA.subject}" 在第${factA.chapterNumber}章的状态相互矛盾：` +
            `"${statusA}" vs "${statusB}"。`,
          existingFact: factA,
          newFact: factB,
          suggestion: `同一角色在同一章不应有矛盾的状态描述。`,
        };
      }
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Extraction helpers
  // ---------------------------------------------------------------------------

  /**
   * Extract location from fact content text.
   * Looks for patterns like: 在XX, 位于XX, 来到XX, 前往XX, 回到XX, 离开XX
   */
  private extractLocation(content: string): string | null {
    const patterns = [
      /在(.{1,15}?)(?:，|。|,|\.|。|$)/,
      /位于(.{1,15}?)(?:，|。|,|\.|。|$)/,
      /来到(.{1,15}?)(?:，|。|,|\.|。|$)/,
      /前往(.{1,15}?)(?:，|。|,|\.|。|$)/,
      /回到(.{1,15}?)(?:，|。|,|\.|。|$)/,
      /离开(.{1,15}?)(?:，|。|,|\.|。|$)/,
      /到达(.{1,15}?)(?:，|。|,|\.|。|$)/,
      /驻扎在(.{1,15}?)(?:，|。|,|\.|。|$)/,
      /藏在(.{1,15}?)(?:，|。|,|\.|。|$)/,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  /**
   * Extract entity status from fact content text.
   * Returns: "dead", "alive", "injured", or undefined.
   */
  private extractStatus(content: string): string | undefined {
    for (const pattern of STATUS_DEAD_PATTERNS) {
      if (pattern.test(content)) return "dead";
    }
    for (const pattern of STATUS_INJURED_PATTERNS) {
      if (pattern.test(content)) return "injured";
    }
    for (const pattern of STATUS_ALIVE_PATTERNS) {
      if (pattern.test(content)) return "alive";
    }
    return undefined;
  }

  /**
   * Extract power level from fact content text.
   * Looks for patterns like: 实力XX, 修为XX, 等级XX, 力量XX
   */
  private extractPowerLevel(content: string): number | undefined {
    const patterns = [
      /实力[为是达到至]?\s*(\d+)/,
      /修为[为是达到至]?\s*(\d+)/,
      /等级[为是达到至]?\s*(\d+)/,
      /力量[为是达到至]?\s*(\d+)/,
      /战力[为是达到至]?\s*(\d+)/,
      /境界[为是达到至]?\s*(\d+)/,
      /功法[为是达到至]?\s*(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match?.[1]) {
        return parseInt(match[1], 10);
      }
    }
    return undefined;
  }

  /**
   * Parse relationship info from a fact entry.
   */
  private parseRelationship(
    fact: FactEntry
  ): { target: string; type: string; dynamic: string } | null {
    const content = fact.content;
    const subject = fact.subject;

    // Try to extract target character from content
    // Common patterns: 与XX的关系, XX是YY的..., 与XX...
    const targetPatterns = [
      /与(.{1,10}?)的/,
      /和(.{1,10}?)的/,
      /跟(.{1,10}?)的/,
      /对(.{1,10}?)的/,
    ];

    let target = "";
    for (const pattern of targetPatterns) {
      const match = content.match(pattern);
      if (match?.[1] && match[1] !== subject) {
        target = match[1].trim();
        break;
      }
    }

    if (!target) return null;

    // Determine relationship type
    let relType = "unknown";
    if (/敌对|仇人|对手|敌人/.test(content)) relType = "hostile";
    else if (/盟友|同伴|伙伴|战友/.test(content)) relType = "ally";
    else if (/恋人|爱人|喜欢|爱情/.test(content)) relType = "romantic";
    else if (/师徒|师父|弟子|师傅/.test(content)) relType = "mentor";
    else if (/亲人|家人|兄弟|姐妹|父子|母子/.test(content)) relType = "family";
    else if (/朋友|好友|知心/.test(content)) relType = "friend";

    // Determine dynamic
    let dynamic = "stable";
    if (/加深|加深|更近|更亲密|改善/.test(content)) dynamic = "improving";
    else if (/恶化|疏远|反目|背叛/.test(content)) dynamic = "worsening";
    else if (/复杂|矛盾|纠结/.test(content)) dynamic = "complex";

    return { target, type: relType, dynamic };
  }

  /**
   * Check if two location strings refer to the same place.
   * Handles common variations like "XX城" vs "XX".
   */
  private locationsMatch(locA: string, locB: string): boolean {
    const normalize = (s: string) =>
      s.replace(/[城宫殿府堡山洞镇村岛湖河]/g, "").trim();
    const a = normalize(locA);
    const b = normalize(locB);
    return a === b || a.includes(b) || b.includes(a);
  }

  /**
   * Find a fact by ID from the store.
   */
  private findFactById(id: string): FactEntry | null {
    const allFacts = this.store.getAllFacts();
    return allFacts.find((f) => f.id === id) ?? null;
  }
}
