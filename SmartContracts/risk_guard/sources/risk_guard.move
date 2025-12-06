module risk_guard::risk_identity {

    use sui::tx_context::TxContext;
    use sui::transfer;

    /// Risk Identity NFT (basit soulbound mantığı ile)
    public struct RiskIdentity has key {
        id: object::UID,
        owner: address,   // NFT sahibinin adresi
        score: u64,       // 0–100 arası risk skoru
        level: u8         // 1: Bronze, 2: Silver, 3: Gold
    }

    /// Backend'in veya kullanıcıların çağıracağı mint fonksiyonu
    public entry fun mint_identity(
        recipient: address,
        score: u64,
        level: u8,
        ctx: &mut TxContext
    ) {
        let nft = RiskIdentity {
            id: object::new(ctx),
            owner: recipient,
            score,
            level,
        };
        // NFT'yi kullanıcıya gönder
        transfer::transfer(nft, recipient);
    }

    /// Read-only getter
    public fun get_metadata(nft: &RiskIdentity): (address, u64, u8) {
        (nft.owner, nft.score, nft.level)
    }
}
