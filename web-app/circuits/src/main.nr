use dep::poseidon;

global ROW_COUNT: u32 = 5;
global COLUMN_COUNT: u32 = 2;

fn main(dataset_hash: Field, expected_rows: pub [[Field; COLUMN_COUNT]; ROW_COUNT]) {
    let mut hash = poseidon::poseidon::bn254::hash_2(expected_rows[0]);

    for i in 1..ROW_COUNT {
        let computed_hash = poseidon::poseidon::bn254::hash_2(expected_rows[i]);
        hash = poseidon::poseidon::bn254::hash_2([hash, computed_hash]);
    }

    assert(dataset_hash == hash);
}
