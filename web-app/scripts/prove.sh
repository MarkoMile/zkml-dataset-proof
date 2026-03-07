export PATH="$HOME/.nargo/bin:$PATH"

cd circuits

rm -rf ./target

nargo execute

npx @aztec/bb.js write_vk_ultra_honk -b ./target/circuits.json -o ./target/vk

npx @aztec/bb.js prove_ultra_honk -b ./target/circuits.json -w ./target/circuits.gz -k ./target/vk -o ./target/proof

npx @aztec/bb.js verify_ultra_honk -k ./target/vk -p ./target/proof && echo "Proof verified successfully"
# -i ./target/public_inputs OVO JE OBRISANO I SAD RADI