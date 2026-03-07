use dep::poseidon;

fn main(
    // --- PUBLIC: commitments (decimal-encoded field elems)
    C_rho  : pub Field,
    C_dW   : pub Field,
    C_B    : pub Field,
    C_sigma: pub Field,

    // --- PRIVATE: witnesses (field elems)
    rho   : Field,
    dW    : Field,   // deltaW
    B     : Field,
    sigma : Field,
) {
    // v = Poseidon([sigma, rho])
    let v = poseidon::poseidon::bn254::hash_2([sigma, rho]);

    // Binding relation inside the circuit
    assert(B == dW * v);

    // Opening checks (commitments are Poseidon([value]))
    assert(poseidon::poseidon::bn254::hash_1([rho])   == C_rho);
    assert(poseidon::poseidon::bn254::hash_1([dW])    == C_dW);
    assert(poseidon::poseidon::bn254::hash_1([B])     == C_B);
    assert(poseidon::poseidon::bn254::hash_1([sigma]) == C_sigma);
}