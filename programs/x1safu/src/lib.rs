use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("5hJZRQKfCDjhvayVbswXBqvh5oThhF1KZvRfA3FCB1EL");

#[program]
pub mod x1safu {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.vault.authority = ctx.accounts.authority.key();
        ctx.accounts.vault.total_tvl = 0;
        ctx.accounts.vault.bump = ctx.bumps.vault;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                }
            ),
            amount
        )?;
        
        ctx.accounts.user_position.amount = ctx.accounts.user_position.amount.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
        ctx.accounts.vault.total_tvl = ctx.accounts.vault.total_tvl.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
        
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(ctx.accounts.user_position.amount >= amount, ErrorCode::InvalidAmount);
        
        let seeds = &[b"vault".as_ref(), &[ctx.accounts.vault.bump]];
        
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                &[&seeds[..]]
            ),
            amount
        )?;
        
        ctx.accounts.user_position.amount -= amount;
        ctx.accounts.vault.total_tvl -= amount;
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + VaultState::SIZE,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, VaultState>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub vault: Account<'info, VaultState>,
    
    #[account(mut)]
    pub user_position: Account<'info, UserPosition>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, VaultState>,
    
    #[account(mut)]
    pub user_position: Account<'info, UserPosition>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct VaultState {
    pub authority: Pubkey,
    pub total_tvl: u64,
    pub bump: u8,
}

impl VaultState {
    pub const SIZE: usize = 32 + 8 + 1;
}

#[account]
pub struct UserPosition {
    pub amount: u64,
}

impl UserPosition {
    pub const SIZE: usize = 8;
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Math overflow")]
    MathOverflow,
}