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
    // Fiat-Shamir Challenge derivation from public commitments
    // This cryptographically binds the challenge to the specific model and dataset
    let v = poseidon::poseidon::bn254::hash_3([C_rho, C_dW, C_sigma]);

    // Binding relation inside the circuit
    assert(B == dW * v);

    // Opening checks (commitments are Poseidon([value]))
    assert(poseidon::poseidon::bn254::hash_1([rho])   == C_rho);
    assert(poseidon::poseidon::bn254::hash_1([dW])    == C_dW);
    assert(poseidon::poseidon::bn254::hash_1([B])     == C_B);
    assert(poseidon::poseidon::bn254::hash_1([sigma]) == C_sigma);
}