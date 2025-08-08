use dep::poseidon;

fn main(
    // --- PUBLIC: commitments (decimal-encoded field elems)
    commitments: pub [Field; 4],
    // --- PRIVATE: witnesses (field elems)
    witnesses: [Field; 4],
) {
    // v = Poseidon([sigma, rho])

    let rho: Field = witnesses[0];
    let dW = witnesses[1];
    let B = witnesses[2];
    let sigma = witnesses[3];

    let C_rho: Field = commitments[0];
    let C_dW = commitments[1];
    let C_B = commitments[2];
    let C_sigma = commitments[3];

    let v = poseidon::poseidon::bn254::hash_2([sigma, rho]);

    assert(B == dW * v);

    // Opening checks (commitments are Poseidon([value]))
    assert(poseidon::poseidon::bn254::hash_1([rho]) == C_rho);
    assert(poseidon::poseidon::bn254::hash_1([dW]) == C_dW);
    assert(poseidon::poseidon::bn254::hash_1([B]) == C_B);
    assert(poseidon::poseidon::bn254::hash_1([sigma]) == C_sigma);
}
