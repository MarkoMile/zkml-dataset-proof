# Zero-Knowledge Dataset Provenance for Machine Learning Models

This repository translates the theoretical framework presented in the paper *"ZKPROV: A Zero-Knowledge Approach to Dataset Provenance for Large Language Models"* into a functional, lightweight implementation using a linear regression model.

* See [Overview](#overview) for details on the implemented methodology.
* See [Capabilities](#capabilities) for a breakdown of the cryptographic features.
* See [Usage](#usage) for instructions on how to set up and run this repository.

Note: This is a proof-of-concept developed during the **Web3 Camp at the Petnica Science Center**.

# Overview

In regulated domains such as healthcare and finance, it is critical to verify that a Machine Learning model was trained on an authorized, authenticated dataset without exposing the sensitive information contained within that dataset.

Rather than verifying the entire computational training process inside a ZK-SNARK, which is computationally prohibitive for large models, this project employs **Statistical Binding** via the Fiat-Shamir heuristic. The implementation cryptographically binds an authenticated dataset's signature to a machine learning model's weight differences, providing a mathematically sound proof of provenance.

The repository is structured into two main components:
* **`ts-scripts/`**: Contains the data processing and model training logic. It acts as the Certificate Authority (CA) to sign the dataset (using BLS12-381 signatures and Poseidon hashing) and simulates the model training process to generate weight differences.
* **`web-app/`**: A Next.js 15 application serving as both the Verifier and the interactive user interface. It computes the cryptographic challenges ($v$) and bindings ($B = \Delta W \times v$) and validates them using a Noir zero-knowledge circuit.

# Capabilities

The system demonstrates the following zero-knowledge capabilities:
* **Dataset Authentication:** Constructing Merkle Trees of dataset rows and signing the root ($\rho$) with a BLS12-381 private key to generate an Authentication Package.
* **Cryptographic Binding:** Utilizing the Fiat-Shamir heuristic to derive a challenge vector ($v$) directly from the public commitments of the dataset signature and the model weights.
* **Zero-Knowledge Verification:** Asserting the statistical binding equation $B = \Delta W \times v$ inside a Noir circuit, proving the provenance of the model weights without revealing the underlying data.
* **Interactive Falsification:** The frontend allows users to intentionally manipulate the input values to demonstrate the fragility of the cryptographic binding. Modifying the inputs breaks the strict mathematical relationship required by the circuit ($B = \Delta W \times v$), resulting in the immediate failure of the proof.

# Usage

### Prerequisites
Before running the program, ensure you have Node.js installed, along with the Aztec/Noir toolchain.

Install Noir (`nargo`):
```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup -v 1.0.0-beta.6
```

Install Barretenberg (`bb`):
```bash
curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/master/barretenberg/cpp/installation/install | bash
bbup --version 0.65.1
```

### Running the Program
To run the Next.js web application and interactive verification dashboard:

1. Navigate to the web application directory:
   ```bash
   cd web-app
   ```
2. Install the required dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

Navigate to `http://localhost:3000/user` in your browser to access the Verification Dashboard. 

### Testing the Proof
* **Valid Proof:** Click **"Generate proof and verify"** to run the Barretenberg prover against the authentic data. A successful verification will yield a green checkmark.
* **Invalid Proof:** Modify any digit in the generated input fields (e.g., `Delta W` or `B`) and click **"Verify with values"**. The tampered witnesses will fail the strict mathematical constraints of the circuit, and the ZK proof will be rejected.

# Literature

This project is a functional implementation of the cryptographic framework described in the following paper:

**Namazi, M., Nemecek, A., & Ayday, E. (2025).** *ZKPROV: A Zero-Knowledge Approach to Dataset Provenance for Large Language Models.* arXiv preprint [arXiv:2506.20915v2](https://arxiv.org/abs/2506.20915v2).