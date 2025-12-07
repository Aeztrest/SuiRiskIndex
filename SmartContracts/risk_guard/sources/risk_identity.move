module risk_guard::risk_identity {

    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::object;

    /// Risk Identity NFT (basit soulbound mantığı ile)
    public struct RiskIdentity has key {
        id: object::UID,
        owner: address,        // NFT sahibinin adresi
        score: u64,            // 0–100 arası risk skoru
        level: u8,             // 1: Bronze, 2: Silver, 3: Gold
        created_at: u64,       // ms cinsinden oluşturulma zamanı (backend'ten gelir)
        last_update_at: u64,   // son güncelleme zamanı
    }

    /// Backend'in veya kullanıcıların çağıracağı mint fonksiyonu
    /// Not: ts_ms backend'ten gelen timestamp olacak (ms cinsinden)
    public entry fun mint_identity(
        recipient: address,
        score: u64,
        level: u8,
        ts_ms: u64,
        ctx: &mut TxContext
    ) {
        let nft = RiskIdentity {
            id: object::new(ctx),
            owner: recipient,
            score,
            level,
            created_at: ts_ms,
            last_update_at: ts_ms,
        };

        // NFT'yi kullanıcıya gönder
        transfer::transfer(nft, recipient);
    }

    /// Eski API'yi bozmayalım: temel metadata
    public fun get_metadata(nft: &RiskIdentity): (address, u64, u8) {
        (nft.owner, nft.score, nft.level)
    }

    /// Sadece skoru dönen helper
    public fun get_score(nft: &RiskIdentity): u64 {
        nft.score
    }

    /// Sadece level dönen helper
    public fun get_level(nft: &RiskIdentity): u8 {
        nft.level
    }

    /// Zaman damgalarını dönen helper
    public fun get_timestamps(nft: &RiskIdentity): (u64, u64) {
        (nft.created_at, nft.last_update_at)
    }
}
