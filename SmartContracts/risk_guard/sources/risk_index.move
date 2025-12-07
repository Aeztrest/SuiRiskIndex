module risk_guard::risk_index {

    use sui::tx_context::TxContext;
    use sui::object;
    use sui::transfer;

    /// Belirli bir likidite havuzu için on-chain risk objesi
    public struct PoolRisk has key {
        id: object::UID,
        owner: address,        // objenin sahibi (genelde protocol admin)
        pool_id: address,      // havuz adresi veya havuzu temsil eden adres
        last_score: u64,       // 0–100 arası son risk skoru
        last_update_ts: u64,   // ms cinsinden son güncelleme zamanı
    }

    /// İlk kez bir havuz için risk objesi yarat
    public entry fun init_pool_risk(
        owner: address,
        pool_id: address,
        ctx: &mut TxContext
    ) {
        let pool = PoolRisk {
            id: object::new(ctx),
            owner,
            pool_id,
            last_score: 0,
            last_update_ts: 0,
        };

        // Objeyi owner'a gönderiyoruz ki storage'da kalsın
        transfer::transfer(pool, owner);
    }

    /// Backend senkronizasyondan sonra skor güncellemesi için
    public entry fun update_score(
        pool: &mut PoolRisk,
        new_score: u64,
        ts: u64,
    ) {
        pool.last_score = new_score;
        pool.last_update_ts = ts;
    }

    public fun get_score(pool: &PoolRisk): u64 {
        pool.last_score
    }

    public fun get_last_update(pool: &PoolRisk): u64 {
        pool.last_update_ts
    }

    public fun get_pool_id(pool: &PoolRisk): address {
        pool.pool_id
    }
}
