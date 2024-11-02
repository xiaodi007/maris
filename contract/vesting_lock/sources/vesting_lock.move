/*
/// Module: vesting_lock
module vesting_lock::vesting_lock {

}
*/
// Copyright (c) 2022, Sui Foundation
// SPDX-License-Identifier: Apache-2.0

/// Basic token locking and vesting example for Move on Sui. 
/// Part of the Sui Move intro course:
/// https://github.com/sui-foundation/sui-move-intro-course
/// 
module vesting_lock::vesting_lock {
    use sui::coin::{Self, Coin, into_balance};
    use std::string;
    use sui::tx_context::sender;
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use std::type_name;
    use sui::event::emit;
    use sui::transfer::{share_object, public_transfer};
 
    const EAlreadyClaimed: u64 = 1; // Already claimed
    const ENotInRecipient: u64 = 2; // Not in the recipient
    const ELocked: u64 = 3; // Still in the lock-up period
    const ENoAvailableAmount: u64 = 4; // No available amount to confirm
    const ENotSender: u64 = 5; // Only the sender can terminate
    const EAlreadyWithdrawn: u64 = 6; // Already fully withdrawn
    const ENonRefundable: u64 = 7; // Non-refundable
    const ECliffDateBeforeStartDate: u64 = 8; // The cliff date must be later than the start date
    const EFinalDateBeforeCliffDate: u64 = 9; // The final date must be later than the cliff date
    const EFinalDateBeforeStartDate: u64 = 10; // The final date must be later than the cliff date
    const EAmountIsZero: u64 = 11;


    public struct Locker<phantom T> has key, store {
        id: UID,
        title: string::String,
        description: Option<string::String>,
        start_timestamp_ms: u64,
        cliff_timestamp_ms: Option<u64>,
        final_timestamp_ms: u64,
        coin_type: string::String,
        original_balance: u64,
        current_balance: Balance<T>,
        revocable: bool,
        sender: address,
        recipient: address,
    }

    // --------------- Events ---------------

    public struct NewLocker<phantom T> has copy, drop {
        lock_id: ID,
        sender: address,
        amount: u64,
        coin_type: string::String,
    }

    public struct ClaimLocker<phantom T> has copy, drop {
        lock_id: ID,
        claimer: address,
        amount: u64,
        coin_type: string::String,
    }

    public struct RefundLocker<phantom T> has copy, drop {
        lock_id: ID,
        refunder: address,
        amount: u64,
        coin_type: string::String,
    }

     public entry fun new_lock<T>(
        title: string::String,
        description: Option<string::String>,
        start_timestamp_ms: u64,
        cliff_timestamp_ms: Option<u64>,
        final_timestamp_ms: u64,
        coin_amount: Coin<T>, 
        revocable: bool,
        recipient: address,
        ctx: &mut TxContext) {

        if(option::is_none(&cliff_timestamp_ms)) {
            assert!(start_timestamp_ms < final_timestamp_ms, EFinalDateBeforeStartDate);
        } else {
            let cliff_timestamp_ms_value = option::borrow(&cliff_timestamp_ms);
            assert!(start_timestamp_ms < *cliff_timestamp_ms_value, ECliffDateBeforeStartDate);
            assert!(*cliff_timestamp_ms_value < final_timestamp_ms, EFinalDateBeforeCliffDate);
        };
        
        let amount = coin_amount.value();
        assert!(amount > 0, EAmountIsZero);

        let sender = tx_context::sender(ctx);
        let _id = object::new(ctx);
        let lock_id = object::uid_to_inner(&_id);
        let coin_type = type_name::get<T>();
        let coin_type_string: string::String = string::from_ascii(*type_name::borrow_string(&coin_type));

        emit(NewLocker<T> {
            lock_id,
            sender,
            amount,
            coin_type: coin_type_string,
        });

        let locker = Locker<T> {
            id: _id,
            title: title,
            description: description,
            start_timestamp_ms: start_timestamp_ms,
            cliff_timestamp_ms: cliff_timestamp_ms,
            final_timestamp_ms: final_timestamp_ms,
            original_balance: amount,
            coin_type: coin_type_string,
            current_balance: into_balance(coin_amount),
            revocable: revocable,
            sender: sender,
            recipient: recipient
        };

        if (revocable) {
            share_object(locker);
        } else { 
            public_transfer(locker, recipient);
         };
    }

    /// claim the available vested amount assuming linear vesting
    entry fun claim_linear_vested<T>(locker: &mut Locker<T>, clock: &Clock, ctx: &mut TxContext){

        if(!option::is_none(&locker.cliff_timestamp_ms)) {
            let cliff_timestamp_ms_value = option::borrow(&locker.cliff_timestamp_ms);
            assert!(clock::timestamp_ms(clock) > *cliff_timestamp_ms_value, ELocked);
        };

        let sender = sender(ctx);
        assert!(locker.recipient == sender, ENotInRecipient);
        
        assert!(locker.original_balance > 0, EAlreadyClaimed);

        let total_duration = locker.final_timestamp_ms - locker.start_timestamp_ms;
        let elapsed_duration = clock::timestamp_ms(clock) - locker.start_timestamp_ms;
        let total_vested_amount = if (elapsed_duration > total_duration) {
            locker.original_balance
        } else {
            locker.original_balance * elapsed_duration / total_duration
        };
        let available_vested_amount = total_vested_amount - (locker.original_balance - balance::value(&locker.current_balance));
        assert!(available_vested_amount > 0, ENoAvailableAmount);

        if ((elapsed_duration > total_duration) && (available_vested_amount < 0)) {
            assert!(false, EAlreadyWithdrawn);
        };


        let coin_type = type_name::get<T>();
        let coin_type_string = string::from_ascii(*type_name::borrow_string(&coin_type));

        emit(ClaimLocker<T>{
            lock_id: object::uid_to_inner(&locker.id),
            claimer: sender,
            amount: available_vested_amount,
            coin_type: coin_type_string,
        });

        transfer::public_transfer(coin::take(&mut locker.current_balance, available_vested_amount, ctx), sender);
    }

    entry fun refund_locker<T>(locker: &mut Locker<T>, ctx: &mut TxContext){

        assert!(locker.sender == sender(ctx), ENotSender);
        assert!(locker.revocable, ENonRefundable);
        

        let available_vested_amount = balance::value(&locker.current_balance);
        let coin_type = type_name::get<T>();
        let coin_type_string = string::from_ascii(*type_name::borrow_string(&coin_type));

        emit(RefundLocker<T> {
            lock_id: object::uid_to_inner(&locker.id),
            refunder: sender(ctx),
            amount: available_vested_amount,
            coin_type: coin_type_string,
        });
        transfer::public_transfer(coin::take(&mut locker.current_balance, available_vested_amount, ctx), locker.sender);
    }

}