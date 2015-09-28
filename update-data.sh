rm -rf data/backup
mkdir -p data/backup
mv data/future.csv data/backup/future.csv
mv data/past.csv data/backup/past.csv
node ../tableToCSV/index.js > data/future.csv
node ../tableToCSV/index.js past > data/past.csv
wc -l data/past.csv
wc -l data/future.csv
sed 1,1d data/past.csv >> data/future.csv
sed '/^$/d' data/future.csv > data/all.csv
echo "Asteroid data updated"