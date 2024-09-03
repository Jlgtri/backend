const con = require('../dbConnection/index');
const router = require('express').Router();
const { latestPriceFeed } = require('../contracts/index');

function isEmpty(value) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}

const convertTimestampToYMDMS = (t) => {
  let year, month, day, hour, minute, second;

  second = t % 60;
  t = Math.floor(t / 60);
  minute = t % 60;
  t = Math.floor(t / 60);
  hour = t % 24;
  t = Math.floor(t / 24);
  day = t % 30;
  t = Math.floor(t / 30);
  month = t % 12;
  t = Math.floor(t / 12);
  year = t;

  if (year > 0) {
    return `${year} Year${year > 1 ? 's' : ''}`;
  }
  if (month > 0) {
    return `${month} Month${month > 1 ? 's' : ''}`;
  }
  if (day > 0) {
    return `${day} Day${day > 1 ? 's' : ''}`;
  }
  if (hour > 0) {
    return `${hour} Hour${hour > 1 ? 's' : ''}`;
  }
  if (minute > 0) {
    return `${minute} Minute${minute > 1 ? 's' : ''}`;
  }
  if (second > 0) {
    return `${second} Second${second > 1 ? 's' : ''}`;
  }
  return '0 Second'; // If the duration is 0
};

router.get('/payment/methods', async (req, res) => {
  try {
    const [chains] = await con.execute(
      'SELECT chains.id AS chain_id , tokens.symbol AS symbol , tokens.name AS name, tokens.image as image, tokens.contractAddress as contractAddress FROM chains JOIN tokens ON chains.id = tokens.chain_id;',
    );

    return res.status(200).json(chains);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/payment/methods/:chain_id?/:symbol?', async (req, res) => {
  const { chain_id, symbol } = req.params;
  if (isEmpty(chain_id))
    return res.status(400).json({ error: 'Chain ID is required.' });
  if (isEmpty(symbol))
    return res.status(400).json({ error: 'Symbol is required.' });
  try {
    const [tokens] = await con.execute(
      'SELECT * FROM `tokens` WHERE `chain_id`=1 AND `symbol`=?',
      [chain_id, symbol],
    );
    if (tokens.length == 0)
      return res.status(400).json({ error: 'Chain ID is not supported.' });
    const tokenAddress = tokens[0].contractAddress;

    const [livePresale] = await con.execute(
      "SELECT * FROM `presales` WHERE `status`='Live'",
    );
    const token_conversion_rate = parseFloat(livePresale[0]?.price);
    const usd_conversion_rate = tokenAddress
      ? 1
      : await latestPriceFeed(chain_id);

    return res.status(200).json({
      chain_id,
      symbol,
      usd_conversion_rate,
      token_conversion_rate,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// All presales route
router.get('/presales', async (req, res) => {
  try {
    const [presales] = await con.execute(
      'SELECT * FROM `presales` ORDER BY `starts_at`',
    );

    if (presales.length === 0) {
      throw new Error('No presales found at the moment.');
    }

    const data = presales.map((presale) => ({
      name: presale.name,
      status: presale.status,
      tokens: presale.total_supply,
      price: parseFloat(presale.price),
      cliff: presale.vesting_starts_after + ' months',
      vesting_period: convertTimestampToYMDMS(presale.vesting_period),
      vesting_month: presale.vesting_period_count,
      tge_unlock: presale.vesting_initial_unlock,
      minimum_buy: presale.minimum_buy,
      maximum_buy: presale.maximum_buy,
    }));

    // Return the presales data
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching presales:', error.message);
    return res.status(400).json({
      error:
        error.message || 'Failed to fetch presales. Please try again later.',
    });
  }
});

// Active presales route
router.get('/presale', async (req, res) => {
  try {
    // Load current active presale
    let [presales] = await con.execute(
      'SELECT * FROM `presales` ORDER BY `starts_at`',
    );

    // Find the live, previous (ended), and next upcoming presales
    const now = new Date();
    let presale = presales.find(
      (presale) =>
        presale.starts_at > now && (!presale.ends_at || now < presale.ends_at),
    );
    presale ??= presales.find((presale) => now < presale.starts_at);
    presale ??= presales
      .reverse()
      .find((presale) => presale.ends_at && now > presale.ends_at);
    // If no presale is found, throw an error
    if (!presale) {
      throw new Error('No live, previous, or upcoming presales found.');
    }

    const nextPresale = presales.find(
      (_) => _.starts_at > activePresale.starts_at,
    );
    const finalPresale = presales.reverse()[0];

    const [currentAmount] = await con.execute(
      "SELECT SUM(`purchased_amount`) as purchased_amount FROM `purchases` WHERE `presale_id`=? AND `payment_status`='paid'",
      [presale.id],
    );

    const response = {
      status: presale.status,
      current: (currentAmount[0]?.purchased_amount || 0) * presale.price,
      total: presale.total_supply * presale.price,
      presale: {
        id: presale.id,
        name: presale.name,
        starts_at: presale.starts_at,
        ends_at: presale.ends_at || null,
        price: parseFloat(presale.price),
        minimum_buy: presale.minimum_buy,
        maximum_buy: presale.maximum_buy,
        total_supply: presale.total_supply,
        vesting_initial_unlock: presale.vesting_initial_unlock,
        vesting_starts_after: presale.vesting_starts_after,
        vesting_period: convertTimestampToYMDMS(presale.vesting_period),
        vesting_period_count: presale.vesting_period_count,
      },
      price: {
        current: parseFloat(presale.price),
        next: parseFloat(nextPresale.price),
        final: parseFloat(finalPresale.price), // Final presale price
      },
    };

    // Return the presales data
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching presales:', error.message);
    return res.status(400).json({
      error:
        error.message || 'Failed to fetch presales. Please try again later.',
    });
  }
});

// transactions----------------------------------------------------------------------------------
router.post('/transactions', async (req, res) => {
  if (Object.keys(req.body).length == 0)
    return res.status(400).json({ error: 'Bad  Request!' });
  const { trx_hash, currency, chainId, ref_address } = req.body;
  if (isEmpty(trx_hash))
    return res.status(400).json({ error: 'Transaction hash is required!' });
  if (isEmpty(currency))
    return res.status(400).json({ error: 'Currency is required!' });
  if (isEmpty(chainId))
    return res.status(400).json({ error: 'Chain ID is required!' });
  try {
    let referral_address = ref_address;
    if (isEmpty(ref_address)) {
      referral_address = '';
    }

    if (
      referral_address &&
      address &&
      address.toLowerCase() == referral_address.toLowerCase()
    ) {
      referral_address = '';
    }

    const [checkTrx] = await con.execute(
      'SELECT *  FROM `purchases` WHERE `hash` LIKE ?',
      [trx_hash],
    );
    if (checkTrx.length > 0)
      return res
        .status(400)
        .json({ error: 'The transaction has already been submitted' });
    const [insert] = await con.execute(
      'INSERT INTO `purchases`(`hash`, `chain_id`, `token_symbol`, `referral_address`) VALUES (?,?,?,?)',
      [trx_hash, chainId, currency, referral_address],
    );

    if (insert.insertId) {
      return res
        .status(201)
        .json({ message: 'The transaction has been submitted successfully.' });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (error) {
    console.error('Database error:', error); // Log the error for debugging
    return res.status(500).json({ error: error.message });
  }
});

// This request retrieves the user's balance and vesting information.
router.get('/balance/:address', async (req, res) => {
  const { address } = req.params;
  if (isEmpty(address))
    return res.status(400).json({ error: 'Wallet address is required' });
  try {
    const [history] = await con.execute(
      "SELECT * FROM `purchases` WHERE `address`=? AND `payment_status`='paid' ORDER BY `id` DESC",
      [address],
    );
    const [referralRewards] = await con.execute(
      "SELECT * FROM `purchases` WHERE `referral_address`=? AND `payment_status`='paid' ORDER BY `id` DESC",
      [address],
    );
    return res
      .status(200)
      .json({ result: history, referralData: referralRewards });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Top 10 ranking wallet-----------------------------
router.get('/topTenWallets', async (req, res) => {
  try {
    const [result] = await con.execute(
      'SELECT address, blox FROM top_ten_wallet ORDER BY blox DESC LIMIT 10',
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
