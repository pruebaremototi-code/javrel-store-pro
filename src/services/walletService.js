/**
 * Billetera local JavrelStore.
 *
 * Guarda saldo y movimientos por correo de cliente en localStorage.
 * Está diseñada como capa funcional inmediata para el checkout; cuando se
 * conecte la billetera transaccional real (Wompi/PayPal), este servicio puede
 * reemplazarse por llamadas a Supabase sin cambiar la UI del carrito.
 */

const STORAGE_KEY = 'javrelstore_customer_wallet_v1';

const safeParse = (raw, fallback) => {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase() || 'invitado';

const readStore = () => {
  try {
    const parsed = safeParse(localStorage.getItem(STORAGE_KEY), {});
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeStore = (store) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('[walletService] No se pudo guardar la billetera:', err);
  }
};

const getAccount = (store, email) => {
  const key = normalizeEmail(email);
  const account = store[key];
  if (!account || typeof account !== 'object') {
    return { balance: 0, transactions: [], updatedAt: null };
  }
  return {
    balance: Number(account.balance) || 0,
    transactions: Array.isArray(account.transactions) ? account.transactions : [],
    updatedAt: account.updatedAt || null,
  };
};

export const walletService = {
  getBalance(email) {
    return getAccount(readStore(), email).balance;
  },

  getAccount(email) {
    return getAccount(readStore(), email);
  },

  recharge(email, amount, method = 'Recarga JavrelStore') {
    const numericAmount = Math.round(Number(amount) || 0);
    if (numericAmount <= 0) {
      return { success: false, error: 'El monto de recarga debe ser mayor a cero.' };
    }

    const store = readStore();
    const key = normalizeEmail(email);
    const account = getAccount(store, email);
    const transaction = {
      id: 'wallet-' + Date.now(),
      type: 'recharge',
      amount: numericAmount,
      method,
      createdAt: new Date().toISOString(),
    };

    store[key] = {
      balance: account.balance + numericAmount,
      transactions: [transaction, ...account.transactions].slice(0, 50),
      updatedAt: transaction.createdAt,
    };
    writeStore(store);

    return { success: true, balance: store[key].balance, transaction };
  },

  debit(email, amount, description = 'Pago en JavrelStore') {
    const numericAmount = Math.round(Number(amount) || 0);
    const store = readStore();
    const key = normalizeEmail(email);
    const account = getAccount(store, email);

    if (numericAmount <= 0) {
      return { success: false, error: 'Monto inválido.' };
    }
    if (account.balance < numericAmount) {
      return {
        success: false,
        error: 'Saldo insuficiente.',
        balance: account.balance,
        missing: numericAmount - account.balance,
      };
    }

    const transaction = {
      id: 'wallet-' + Date.now(),
      type: 'debit',
      amount: numericAmount,
      description,
      createdAt: new Date().toISOString(),
    };

    store[key] = {
      balance: account.balance - numericAmount,
      transactions: [transaction, ...account.transactions].slice(0, 50),
      updatedAt: transaction.createdAt,
    };
    writeStore(store);

    return { success: true, balance: store[key].balance, transaction };
  },
};
