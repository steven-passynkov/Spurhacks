class GlobalStore:
    _instance = None
    _store = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GlobalStore, cls).__new__(cls)
        return cls._instance

    def set(self, key, value):
        self._store[key] = value

    def get(self, key, default=None):
        return self._store.get(key, default)

    def clear(self):
        self._store.clear()
        self.set("conversation_history", [])