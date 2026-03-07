use dep::poseidon;

fn main(dataset_hashes: [Field; 545], expected_rows: pub [[Field; 13]; 545]) {
    for i in 0..544 {
        let row = expected_rows[i];

        print(row);

        let computed_hash = poseidon::poseidon::bn254::hash_13(row);

        let hash = dataset_hashes[i];

        assert(computed_hash == hash);
    }
}
