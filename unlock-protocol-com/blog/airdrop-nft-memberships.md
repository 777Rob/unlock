---
title: Airdrop for NFT Memberships
subTitle: How to easily grant access to token-gated communities
authorName: Julien Genestoux
publishDate: January 11, 2022
description: Creators have multiple options to airdrop memberships to their fans so they can become members and receive the NFT in their wallets
image: /images/blog/airdrop-nft-memberships/dashboard.gif
---

Creators can easily deploy their membership contracts (called Locks) using the Unlock dashboard. Each Lock has different membership terms: membership price, number of members, duration of the membership (yes, the NFT does expire!)... etc.

Memberships can then be purchased directly by the fans. This happens by calling the [`purchase` function](https://docs.unlock-protocol.com/developers/smart-contracts/lock-api#purchase) on the Lock contract. In practice, this function can actually be called with another recipient's address, in order for them to receive the NFT (instead of the buyer).

However, in many cases, creators may want to "give away" or **airdrop NFT memberships** for free to some of their users. Here are example of why this is useful:

- This is how our [credit card](/blog/credit-card-nft) flow works: the NFT is paid "off chain" via a credit card transaction, and _granted_ on chain (technically, no on-chain payment happens).
- Someone might want to give a "limited time" trial. For example, my [personal blog](https://ouvre-boite.com) has a membership of its own, where NFTs expire after 1 year, but where anyone who [follows me on Twitter](https://twitter.com/julien51) [can claim a 30 minute](https://claim-ouvre-boite-membership.herokuapp.com/) trial!
- Lastly, some creators structure their communities and memberships as a special access key that is granted, not purchased. [PlannerDAO](https://twitter.com/PlannerDAO/status/1479097169747529735) uses this structure to run their community.

# How to airdrop NFT memberships

## Using the Dashboard

Once you've deployed your lock, head to the members page.

![Dashboard](/images/blog/airdrop-nft-memberships/dashboard.png)

On that page you will see the list of all the members on your lock. You can also see a button that lets you airdrop an NFT: click on it!

![Members Page](/images/blog/airdrop-nft-memberships/members-page.png)

Once the drawer opens, you can airdrop a membership to any address you paste into that space/drawer.

- Make sure the lock is the correct one!

- Enter the recipient's address or ENS name. Using the ENS name will help avoid many common typos.

- After you've entered the address, select the expiration date on the airdropped membership. By default, the expiration is the same as the duration of the lock, but you can customize the airdropped NFT expiration date. This feature works great for granting temporary access keys for trials and demos.

- Last, but never least, you may delegate a "key manager". At Unlock, we decouple the "owner" of an NFT from the account who possess transfer abilities for the NFT in question. By default and in many cases, the owner and manager are the same. But certain unique use-cases do require the blocking of transfer access by the NFT owner. For fraud reasons, we want to ensure that the NFT bought via credit card this way are non-transferable. Similarly, granted keys could be "cancelled" by their owner, and by default, triggering a refund. In these cases, retaining the key manager role is important.

- Once ready, submit the transaction!

![Airdrop](/images/blog/airdrop-nft-memberships/dashboard.gif)

## Using code

Don't forget, you can always grant keys through code!

The `grantKeys` function on the lock can be called by any _lock manager_ or _key granter_ ([read more about the roles](https://docs.unlock-protocol.com/developers/smart-contracts/lock-api/access-control)).

To reduce risks, we recommend using a dedicated `key granter` in your application. That way, if an account (or contract) is compromised, the attacker can "only" grant new keys (which the lock manager can cancel).

Then, on your code you would call the [`grantKeys` function](https://docs.unlock-protocol.com/developers/smart-contracts/lock-api#grantkeys). You can call this function to grant multiple keys to multiple users at the same time. There is a practical limit based on the block-size of each chain. You would call this function with 3 arrays of the same size:

1. the recipients
2. the expiration timestamps
3. the key managers

---

Airdropping is a vital function of the protocol as it enables both multiple types of memberships and new ways of rewarding or incentivizing community members!
