var analytics = require('../index.js');
const lineByLine = require('n-readlines');
const dayjs = require('dayjs');

/**
 * Indicators selected for calculation
 * @type {Array}
 */
var indicators = [
  'CCI',
  'MACD',
  'MACD_Signal',
  'MACD_Histogram',
  'Momentum',
  'RSI',
  'BOP',
  'ATR',
  'SAR',
  'SMA15_SMA50',
  'Stochastic'
];

var stopLoss = 0.0010;
var takeProfit = 0.0013;

/**
 * Calculates and presents potential revenue of a given strategy for given
 * candlesticks
 */
function calculateTrades(candlesticks, strategy) {
  var trades = getTrades(candlesticks, strategy);

  var totalRevenue = 0;
  var totalNoOfTrades = 0;
  var numberOfProfitTrades = 0;
  var numberOfLossTrades = 0;
  var maximumLoss = 0;

  for (var i = 0; i < trades.length; i++) {

    var revenue;

    if (stopLoss < trades[i].MaximumLoss) {
      revenue = -stopLoss;
    } else if (takeProfit < trades[i].MaximumProfit  && (!trades[i].ProfitBeforeLoss || takeProfit > trades[i].MaximumProfit)) {
      revenue = takeProfit;
    } else {
      revenue = trades[i].Revenue || 0;
    }

    if (revenue > 0) numberOfProfitTrades++;
    else numberOfLossTrades++;

    totalNoOfTrades++;

    totalRevenue += revenue;

    if (maximumLoss < trades[i].MaximumLoss)
      maximumLoss = trades[i].MaximumLoss;
  }

  console.log('Total theoretical revenue is: ' + totalRevenue + ' PIPS');
  console.log('Maximum theoretical loss is: ' + maximumLoss + ' PIPS');
  console.log('Total number of Profitable trades is: ' + numberOfProfitTrades);
  console.log('Total number of loss trades is: ' + numberOfLossTrades);
  console.log('Total number of trades is: ' + totalNoOfTrades);
}

/**
 * Returns an object representing buy/sell strategy
 * @param  {Object} candlesticks Input candlesticks for strategy estimation
 */
function createStrategy(candlesticks, testing30MinuteCandlesticks) {

  var lastFitness = -1;

  return analytics.findStrategy(candlesticks, {
    populationCount: 3000,
    generationCount: 500,
    selectionAmount: 10,
    leafValueMutationProbability: 0.3,
    leafSignMutationProbability: 0.1,
    logicalNodeMutationProbability: 0.05,
    leafIndicatorMutationProbability: 0.2,
    crossoverProbability: 0.03,
    indicators: indicators
  }, function(strategy, fitness, generation) {

    console.log('---------------------------------');
    console.log('Fitness: ' + fitness + '; Generation: ' + generation);

    if (lastFitness == fitness)
      return;

    lastFitness = fitness;

    console.log('-----------Training--------------');
    calculateTrades(candlesticks, strategy);

    console.log('-----------Testing--------------');
    calculateTrades(testing30MinuteCandlesticks, strategy);
  });
}

/**
 * Gets an array of trades using a set of candlesticks and strategy
 * @param  {Object} candlesticks Input candlesticks for trade estimation
 * @param  {Object} strategy     Strategy obtained by the findStrategy function
 */
function getTrades(candlesticks, strategy) {
  return analytics.getTrades(candlesticks, {
    strategy: strategy
  });
}

console.log('Loading training data set');


async function start() {
  file = new lineByLine(`../../binfut/data/BTCUSDT-30s.txt`)
  let line
  let candlesticks = []
  while(line = file.next()) {
    let obj = JSON.parse(line.toString())
    candlesticks.push({
      open: obj.open,
      high: obj.high,
      low: obj.low,
      close: obj.close,
      time: dayjs(obj.closeTime).toDate() // startTime
    })
  }

  file2 = new lineByLine(`../../binfut/data/ETHUSDT-30s.txt`)
  let line2
  let candlesticks2 = []
  while(line2 = file2.next()) {
    let obj = JSON.parse(line2.toString())
    candlesticks2.push({
      open: obj.open,
      high: obj.high,
      low: obj.low,
      close: obj.close,
      time: dayjs(obj.closeTime).toDate() // startTime
    })
  }

  let strategy = await createStrategy(candlesticks, candlesticks2)
  console.log('------------Strategy-------------')
  console.log(JSON.stringify(strategy, null, 4))
  console.log('---------------------------------')
  calculateTrades(candlesticks2, strategy);

  process.exit(0)
}

start()
