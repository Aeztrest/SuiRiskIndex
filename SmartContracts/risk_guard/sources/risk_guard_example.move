module risk_guard::risk_guard_example {

    use sui::tx_context::TxContext;
    use sui::object;
    use sui::transfer;

    use risk_guard::risk_identity;
    use risk_guard::risk_index;

    const E_HIGH_USER_RISK: u64 = 1;
    const E_HIGH_POOL_RISK: u64 = 2;

    /// Basit bir vault örneği (demo amaçlı)
    public struct Vault has key {
        id: object::UID,
        owner: address,
        total_deposit: u64,
    }

    /// Vault oluştur ve owner'a gönder
    public entry fun create_vault(owner: address, ctx: &mut TxContext) {
        let vault = Vault {
            id: object::new(ctx),
            owner,
            total_deposit: 0,
        };

        transfer::transfer(vault, owner);
    }

    /// Kullanıcının RiskIdentity'sine göre deposit'e izin veren örnek
    /// Örnek kural: risk skoru 80'in üzerindeyse deposit'e izin verme
    public entry fun guarded_deposit_by_identity(
        vault: &mut Vault,
        identity: &risk_identity::RiskIdentity,
        amount: u64,
    ) {
        let score = risk_identity::get_score(identity);

        if (score > 80) {
            abort E_HIGH_USER_RISK;
        };

        vault.total_deposit = vault.total_deposit + amount;
    }

    /// Havuz riskine göre guard eden ikinci örnek
    /// Örnek kural: pool risk skoru 80'in üzerindeyse bu vault'a deposit edilemez
    public entry fun guarded_deposit_by_pool(
        vault: &mut Vault,
        pool_risk: &risk_index::PoolRisk,
        amount: u64,
    ) {
        let pool_score = risk_index::get_score(pool_risk);

        if (pool_score > 80) {
            abort E_HIGH_POOL_RISK;
        };

        vault.total_deposit = vault.total_deposit + amount;
    }
}
