const fs = require('fs');
const path = require('path');

const DATA_FILE_PATH = path.join(__dirname, '..', 'data', 'activity_store.json');

// Load persisted data if available
function loadPersistedData() {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
        focusSessions: Array.isArray(parsed.focusSessions) ? parsed.focusSessions : [],
        studyActivities: Array.isArray(parsed.studyActivities) ? parsed.studyActivities : [],
      };
    }
  } catch (e) {
    console.warn('[InMemoryStore] Failed to load persisted activity store:', e.message);
  }
  return { attempts: [], focusSessions: [], studyActivities: [] };
}

const initialData = loadPersistedData();

const inMemoryStore = {
  profiles: new Map([
    [
      '00000000-0000-0000-0000-000000000001',
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Guest Student',
        class: 'Class 12th',
        exam: 'NEET',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  ]),

  tests: [],
  attempts: initialData.attempts,
  focusSessions: initialData.focusSessions,
  studyActivities: initialData.studyActivities,
  mistakes: [],
  insights: [],
  documents: [],

  save() {
    try {
      const dir = path.dirname(DATA_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const dataToSave = {
        attempts: this.attempts,
        focusSessions: this.focusSessions,
        studyActivities: this.studyActivities,
      };
      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[InMemoryStore] Failed to save persistence:', e.message);
    }
  },
};

module.exports = inMemoryStore;
