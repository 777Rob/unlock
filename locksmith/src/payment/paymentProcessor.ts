import Stripe from 'stripe'
import { User } from '../models/user'
import { Charge } from '../models/charge'
import { UserReference } from '../models/userReference'
import * as Normalizer from '../utils/normalizer'
import KeyPricer from '../utils/keyPricer'
import { ethereumAddress } from '../types' // eslint-disable-line import/named, no-unused-vars
import Dispatcher from '../fulfillment/dispatcher'
import {
  getStripeCustomerIdForAddress,
  saveStripeCustomerIdForAddress,
} from '../operations/stripeOperations'
import logger from '../logger'

const Sequelize = require('sequelize')

const { Op } = Sequelize
export class PaymentProcessor {
  stripe: Stripe

  keyPricer: KeyPricer

  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2020-08-27',
    })
    this.keyPricer = new KeyPricer()
  }

  // eslint-disable-next-line class-methods-use-this
  async findUserByPublicKey(publicKey: ethereumAddress) {
    const normalizedEthereumAddress = Normalizer.ethereumAddress(publicKey)

    return UserReference.findOne({
      where: { publicKey: { [Op.eq]: normalizedEthereumAddress } },
      include: [{ model: User, attributes: ['publicKey'] }],
    })
  }

  /**
   *  appropriate stripe customer id based on the provided token.
   * @param token
   * @param emailAddress
   */
  async updateUserPaymentDetails(
    token: string,
    publicKey: ethereumAddress
  ): Promise<boolean> {
    try {
      const user = await this.findUserByPublicKey(publicKey)
      const stripeCustomerId = await getStripeCustomerIdForAddress(publicKey)

      // If we already have a stripe customer id
      if (stripeCustomerId) {
        await this.stripe.customers.createSource(stripeCustomerId, {
          source: token,
        })

        return true
      }

      const customer = await this.stripe.customers.create({
        email: user ? user.emailAddress : '', // The stripe API does not require a valid email to be passed
        source: token,
      })

      if (!customer) {
        return false
      }

      return !!(await saveStripeCustomerIdForAddress(publicKey, customer.id))
    } catch (error) {
      logger.error(
        `Failed to update payment details for ${publicKey}: there was an error.`,
        error
      )
      return false
    }
  }

  /**
   *  DEPRECATED
   *  Charges an appropriately configured user with purchasing details, with the amount specified
   *  in the purchase details
   * @param userAddress
   * @param purchaseDetails
   */
  async chargeUserForConnectedAccount(
    userAddress: ethereumAddress,
    stripeCustomerId: string,
    lock: ethereumAddress,
    // eslint-disable-next-line no-unused-vars
    connectedStripeId: string,
    network: number,
    maxPrice: number // Agreed to by user!
  ) {
    const pricing = await new KeyPricer().generate(lock, network)
    const totalPriceInCents = Object.values(pricing).reduce((a, b) => a + b)
    const maxPriceInCents = maxPrice * 100
    if (
      Math.abs(totalPriceInCents - maxPriceInCents) >
      0.03 * maxPriceInCents
    ) {
      // if price diverged by more than 3%, we fail!
      throw new Error('Price diverged by more than 3%. Aborting')
    }
    // We need to create a new customer specifically for this stripe connected account

    const token = await this.stripe.tokens.create(
      { customer: stripeCustomerId },
      { stripeAccount: connectedStripeId }
    )

    const connectedCustomer = await this.stripe.customers.create(
      { source: token.id },
      { stripeAccount: connectedStripeId }
    )

    const charge = await this.stripe.charges.create(
      {
        amount: totalPriceInCents,
        currency: 'USD',
        customer: connectedCustomer.id,
        metadata: {
          lock,
          userAddress,
          network,
          maxPrice,
        },
        application_fee_amount: pricing.unlockServiceFee,
      },
      {
        stripeAccount: connectedStripeId,
      }
    )
    return {
      userAddress,
      lock,
      charge: charge.id,
      connectedCustomer: connectedCustomer.id,
      stripeCustomerId,
      totalPriceInCents,
      unlockServiceFee: pricing.unlockServiceFee,
    }
  }

  /**
   *
   * @param recipient
   * @param stripeCustomerId
   * @param lock
   * @param maxPrice
   * @param network
   * @param stripeAccount
   * @returns
   */
  async createPaymentIntent(
    recipient: ethereumAddress /** this is the recipient of the granted key */,
    stripeCustomerId: string, // Stripe token of the buyer
    lock: ethereumAddress,
    maxPrice: any,
    network: number,
    stripeAccount: string
  ) {
    const pricing = await new KeyPricer().generate(lock, network)
    const totalPriceInCents = Object.values(pricing).reduce((a, b) => a + b)
    const maxPriceInCents = maxPrice * 100
    if (
      Math.abs(totalPriceInCents - maxPriceInCents) >
      0.03 * maxPriceInCents
    ) {
      // if price diverged by more than 3%, we fail!
      throw new Error('Price diverged by more than 3%. Aborting')
    }
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    })

    const intent = await this.stripe.paymentIntents.create({
      amount: totalPriceInCents,
      currency: 'usd',
      customer: stripeCustomerId,
      payment_method: paymentMethods.data[0].id,
      capture_method: 'manual', // We need to confirm on front-end but will capture payment back on backend.
      metadata: {
        lock,
        recipient,
        network,
        maxPrice,
      },
      application_fee_amount: pricing.unlockServiceFee,
      on_behalf_of: stripeAccount,
      transfer_data: {
        destination: stripeAccount,
      },
    })
    return intent.client_secret
  }

  /**
   *
   * @param recipient
   * @param stripeCustomerId
   * @param lock
   * @param maxPrice
   * @param network
   * @param stripeAccount
   * @returns
   */
  async captureConfirmedPaymentIntent(
    recipient: ethereumAddress /** this is the recipient of the granted key */,
    lock: ethereumAddress,
    network: number,
    paymentIntentId: string
  ) {
    const pricing = await new KeyPricer().generate(lock, network)
    const totalPriceInCents = Object.values(pricing).reduce((a, b) => a + b)

    const paymentIntent = await this.stripe.paymentIntents.retrieve(
      paymentIntentId
    )

    if (paymentIntent.metadata.lock !== lock) {
      throw new Error('Lock does not match with initial intent. Aborting')
    }

    if (paymentIntent.metadata.recipient !== recipient) {
      throw new Error('Recipient does not match with initial intent. Aborting')
    }

    const maxPriceInCents = paymentIntent.amount
    if (
      Math.abs(totalPriceInCents - maxPriceInCents) >
      0.03 * maxPriceInCents
    ) {
      // if price diverged by more than 3%, we fail!
      throw new Error('Price diverged by more than 3%. Aborting')
    }

    await this.stripe.paymentIntents.capture(paymentIntentId)
    const fulfillmentDispatcher = new Dispatcher()
    return new Promise((resolve, reject) => {
      try {
        fulfillmentDispatcher.grantKey(
          paymentIntent.metadata.lock,
          paymentIntent.metadata.recipient,
          parseInt(paymentIntent.metadata.network, 10),
          async (_: any, transactionHash: string) => {
            // Should we proceed differently here? Save the charge before and keep the state?
            // This would allow us to easily retrieve transactions that might have failed.
            const charge: Charge = await Charge.create({
              userAddress: paymentIntent.metadata.recipient,
              lock: paymentIntent.metadata.lock,
              stripeCustomerId: paymentIntent.customer,
              connectedCustomer: paymentIntent.customer,
              totalPriceInCents: paymentIntent.amount,
              unlockServiceFee: paymentIntent.application_fee_amount,
              stripeCharge: paymentIntent.id,
              transactionHash,
              chain: network,
            })
            return resolve(charge.transactionHash)
          }
        )
      } catch (error) {
        reject(error)
      }
    })
  }

  // DEPRECATED
  async initiatePurchaseForConnectedStripeAccount(
    recipient: ethereumAddress /** this is the recipient of the granted key */,
    stripeCustomerId: string, // Stripe token of the buyer
    lock: ethereumAddress,
    pricing: any,
    network: number,
    stripeAccount: string
  ) {
    const fulfillmentDispatcher = new Dispatcher()
    const chargeData = await this.chargeUserForConnectedAccount(
      recipient,
      stripeCustomerId,
      lock,
      stripeAccount,
      network,
      pricing
    )
    return new Promise((resolve, reject) => {
      try {
        fulfillmentDispatcher.grantKey(
          lock,
          recipient,
          network,
          async (_: any, transactionHash: string) => {
            const charge: Charge = await Charge.create({
              userAddress: chargeData.userAddress,
              lock: chargeData.lock,
              stripeCustomerId: chargeData.stripeCustomerId,
              connectedCustomer: chargeData.connectedCustomer,
              totalPriceInCents: chargeData.totalPriceInCents,
              unlockServiceFee: chargeData.unlockServiceFee,
              stripeCharge: chargeData.charge,
              transactionHash,
              chain: network,
            })
            return resolve(charge.transactionHash)
          }
        )
      } catch (error) {
        reject(error)
      }
    })
  }
}

export default PaymentProcessor
