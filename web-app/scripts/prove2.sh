cd circuits2

rm -r ./target

nargo execute

bb prove -b ./target/circuits2.json -w ./target/circuits2.gz -o ./target

bb write_vk -b ./target/circuits2.json -o ./target

bb verify -k ./target/vk -p ./target/proof
# -i ./target/public_inputs OVO JE OBRISANO I SAD RADI