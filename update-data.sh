mkdir -p data/backup
mv data/*csv backup/*
node ../tableToCSV/index.js > data/future.csv
node ../tableToCSV/index.js past > data/past.csv