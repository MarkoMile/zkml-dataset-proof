cd circuits

rm -r ./target

nargo execute

bb prove -b ./target/circuits.json -w ./target/circuits.gz -o ./target

bb write_vk -b ./target/circuits.json -o ./target

bb verify -k ./target/vk -p ./target/proof
# -i ./target/public_inputs OVO JE OBRISANO I SAD RADI